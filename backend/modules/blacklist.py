"""
Módulo de Lista Negra — integra Feodo Tracker (abuse.ch) + entradas manuales.
Feodo Tracker provee IPs de servidores C2 de botnets activos (Emotet, Dridex, TrickBot, etc.)
"""
import json
import requests
import threading
from pathlib import Path
from datetime import datetime, timedelta

FEED_URL   = "https://feodotracker.abuse.ch/downloads/ipblocklist.json"
CACHE_PATH = Path(__file__).parent.parent / "data" / "feodo_cache.json"
MANUAL_PATH = Path(__file__).parent.parent / "data" / "blacklist_manual.json"
CACHE_TTL_HOURS = 6
_lock = threading.Lock()

# Información educativa sobre cada familia de malware
MALWARE_INFO: dict[str, dict] = {
    "Emotet": {
        "desc": "Troyano bancario y dropper polimórfico. Roba credenciales, envía spam y descarga otros malwares como TrickBot o Ryuk ransomware. Fue considerado el malware más peligroso del mundo por Europol.",
        "severity": "critical",
        "color": "#ff4444",
    },
    "Dridex": {
        "desc": "Troyano bancario avanzado que roba credenciales de banca en línea mediante inyección web. Usa macros maliciosas en documentos Office para su distribución. Responsable de pérdidas millonarias globalmente.",
        "severity": "critical",
        "color": "#ff4444",
    },
    "TrickBot": {
        "desc": "Troyano modular con capacidades de robo de credenciales, movimiento lateral y reconocimiento de red. Frecuentemente usado como precursor de ataques de ransomware Ryuk y Conti.",
        "severity": "critical",
        "color": "#ff4444",
    },
    "QakBot": {
        "desc": "Troyano bancario con capacidades avanzadas de evasión y persistencia. Se propaga por correo electrónico y roba credenciales bancarias y corporativas. Usado para distribuir ransomware Black Basta.",
        "severity": "high",
        "color": "#f0883e",
    },
    "BazarLoader": {
        "desc": "Loader sigiloso utilizado para instalar herramientas de post-explotación y ransomware. Usa certificados de firma de código para evadir antivirus. Vinculado al grupo TrickBot.",
        "severity": "high",
        "color": "#f0883e",
    },
    "IcedID": {
        "desc": "Troyano bancario que roba credenciales financieras y datos personales mediante inyección en el navegador. Se distribuye por phishing y documentos maliciosos.",
        "severity": "high",
        "color": "#f0883e",
    },
    "Cobalt Strike": {
        "desc": "Framework legítimo de pentesting frecuentemente abusado por actores maliciosos. Los C2 de Cobalt Strike indican compromiso activo de red con herramientas de post-explotación.",
        "severity": "critical",
        "color": "#ff4444",
    },
}

DEFAULT_INFO = {
    "desc": "Servidor de comando y control (C2) de botnet identificado por Feodo Tracker / abuse.ch.",
    "severity": "high",
    "color": "#f0883e",
}

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


# ── Caché del feed ──────────────────────────────────────────────────────────────

def _load_cache() -> dict | None:
    if not CACHE_PATH.exists():
        return None
    try:
        data = json.loads(CACHE_PATH.read_text())
        fetched = datetime.fromisoformat(data.get("fetched_at", "2000-01-01"))
        if datetime.utcnow() - fetched < timedelta(hours=CACHE_TTL_HOURS):
            return data
    except Exception:
        pass
    return None


def _fetch_feed() -> list:
    try:
        r = requests.get(FEED_URL, timeout=20, headers={"User-Agent": "IDS-Institucional/1.0"})
        r.raise_for_status()
        entries = r.json()
        cache = {"fetched_at": datetime.utcnow().isoformat(), "entries": entries}
        with _lock:
            CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False))
        return entries
    except Exception as exc:
        print(f"[blacklist] Error al obtener Feodo Tracker: {exc}")
        # Intentar devolver caché expirada antes de fallar
        if CACHE_PATH.exists():
            try:
                return json.loads(CACHE_PATH.read_text()).get("entries", [])
            except Exception:
                pass
        return []


def _get_feed_entries() -> list:
    cache = _load_cache()
    return cache["entries"] if cache else _fetch_feed()


def refresh_feed() -> dict:
    entries = _fetch_feed()
    return {
        "count": len(entries),
        "fetched_at": datetime.utcnow().isoformat(),
        "message": f"Feed actualizado: {len(entries)} IPs de Feodo Tracker",
    }


# ── Lista manual ─────────────────────────────────────────────────────────────────

def _load_manual() -> list:
    if not MANUAL_PATH.exists():
        MANUAL_PATH.parent.mkdir(parents=True, exist_ok=True)
        MANUAL_PATH.write_text(json.dumps([], ensure_ascii=False))
    try:
        return json.loads(MANUAL_PATH.read_text())
    except Exception:
        return []


def _save_manual(entries: list) -> None:
    with _lock:
        MANUAL_PATH.write_text(json.dumps(entries, indent=2, ensure_ascii=False))


def add_manual(ip: str, threat_type: str, description: str, severity: str) -> dict:
    entries = _load_manual()
    entry = {
        "ip": ip,
        "threat_type": threat_type,
        "description": description or "Entrada manual de lista negra",
        "severity": severity,
        "source": "manual",
        "added_at": datetime.utcnow().isoformat(),
    }
    entries = [e for e in entries if e["ip"] != ip]
    entries.append(entry)
    _save_manual(entries)
    return entry


def delete_manual(ip: str) -> bool:
    entries = _load_manual()
    new_list = [e for e in entries if e["ip"] != ip]
    if len(new_list) == len(entries):
        return False
    _save_manual(new_list)
    return True


def is_blacklisted(ip: str) -> dict | None:
    """Devuelve info de la entrada si la IP está en la lista negra (feed + manual)."""
    for e in _load_manual():
        if e["ip"] == ip:
            return e
    for e in _get_feed_entries():
        if e.get("ip_address") == ip:
            mw = e.get("malware", "Unknown")
            info = MALWARE_INFO.get(mw, DEFAULT_INFO)
            return {"ip": ip, "threat_type": mw, **info, "source": "feodo"}
    return None


# ── Consulta principal ───────────────────────────────────────────────────────────

def get_all(
    malware: str = "",
    status_filter: str = "",
    country: str = "",
    search: str = "",
) -> dict:
    raw_feed = _get_feed_entries()

    enriched_feed: list[dict] = []
    malware_families: dict[str, int] = {}
    countries: dict[str, int] = {}
    online_count = 0

    for e in raw_feed:
        mw      = e.get("malware", "Unknown")
        st      = e.get("status", "unknown")
        ct      = e.get("country") or "—"
        ip      = e.get("ip_address", "")
        port    = e.get("port")
        first   = e.get("first_seen", "")
        last    = e.get("last_seen", "")
        info    = MALWARE_INFO.get(mw, DEFAULT_INFO)

        # Filtros
        if malware and mw.lower() != malware.lower():
            continue
        if status_filter and st.lower() != status_filter.lower():
            continue
        if country and ct.upper() != country.upper():
            continue
        if search and search.lower() not in ip.lower() and search.lower() not in mw.lower():
            continue

        enriched_feed.append({
            "ip":          ip,
            "port":        port,
            "malware":     mw,
            "status":      st,
            "country":     ct,
            "first_seen":  first,
            "last_seen":   last,
            "description": info["desc"],
            "severity":    info["severity"],
            "color":       info["color"],
            "source":      "feodo",
        })

        malware_families[mw] = malware_families.get(mw, 0) + 1
        countries[ct]        = countries.get(ct, 0) + 1
        if st == "Online":
            online_count += 1

    # Ordenar: online primero, luego por severidad
    enriched_feed.sort(key=lambda x: (
        0 if x["status"] == "Online" else 1,
        SEVERITY_ORDER.get(x["severity"], 9),
    ))

    cache = _load_cache()
    fetched_at = cache["fetched_at"] if cache else None

    return {
        "feed":   enriched_feed,
        "manual": _load_manual(),
        "stats": {
            "total_feed":       len(enriched_feed),
            "online":           online_count,
            "offline":          len(enriched_feed) - online_count,
            "malware_families": sorted(malware_families.items(), key=lambda x: -x[1]),
            "top_countries":    sorted(countries.items(), key=lambda x: -x[1])[:15],
            "fetched_at":       fetched_at,
            "total_manual":     len(_load_manual()),
        },
    }
