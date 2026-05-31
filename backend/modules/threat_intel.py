"""
IDS Institucional - Módulo de Inteligencia de Amenazas
Carga lista negra de IPs peligrosas y envía alertas de emergencia al detectar conexiones
"""
import json
import logging
import threading
from datetime import datetime
from typing import List, Optional

from config import settings
from modules.alerts import alert_threat_detected

logger = logging.getLogger(__name__)
_lock = threading.Lock()
_threat_events: List[dict] = []


def _load_blacklist() -> List[dict]:
    try:
        with open(settings.blacklist_path, "r", encoding="utf-8") as f:
            return json.load(f).get("threats", [])
    except FileNotFoundError:
        return []


def get_blacklist() -> List[dict]:
    return _load_blacklist()


def add_to_blacklist(ip: str, threat_type: str, severity: str, description: str) -> dict:
    with _lock:
        try:
            with open(settings.blacklist_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            data = {"threats": []}
        entry = {"ip": ip, "type": threat_type, "severity": severity, "description": description}
        data["threats"] = [t for t in data["threats"] if t["ip"] != ip]
        data["threats"].append(entry)
        with open(settings.blacklist_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return entry


def check_ip(ip: str, source_ip: str = "") -> Optional[dict]:
    """Comprueba si una IP destino está en la lista negra y emite alerta si es así."""
    blacklist = _load_blacklist()
    for threat in blacklist:
        if threat["ip"] == ip or ip.startswith(threat["ip"].rstrip("0")):
            event = {
                "id": f"{datetime.now().timestamp():.0f}",
                "timestamp": datetime.now().isoformat(),
                "source_ip": source_ip,
                "dest_ip": ip,
                "threat_type": threat["type"],
                "severity": threat["severity"],
                "description": threat["description"],
                "alert_sent": False,
            }
            logger.critical(
                "AMENAZA DETECTADA: %s → %s (%s)", source_ip, ip, threat["type"]
            )
            event["alert_sent"] = alert_threat_detected(
                source_ip, ip, threat["type"], threat["severity"], threat["description"]
            )
            with _lock:
                _threat_events.append(event)
                if len(_threat_events) > 1000:
                    _threat_events.pop(0)
            return event
    return None


def get_threat_events(limit: int = 50) -> List[dict]:
    with _lock:
        return list(reversed(_threat_events[-limit:]))


def get_stats() -> dict:
    with _lock:
        critical = sum(1 for e in _threat_events if e["severity"] == "critical")
        return {
            "total_events": len(_threat_events),
            "critical": critical,
            "high": sum(1 for e in _threat_events if e["severity"] == "high"),
        }
