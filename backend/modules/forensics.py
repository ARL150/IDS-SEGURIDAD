"""
IDS Institucional - Módulo de Automatización Forense
Consulta WHOIS y AbuseIPDB para obtener datos de contacto del proveedor
y los envía por correo al administrador para facilitar el reporte de abuso
"""
import logging
import socket
import threading
from datetime import datetime
from typing import Dict, Optional

import requests
import whois

from config import settings
from modules.alerts import alert_forensic_report

logger = logging.getLogger(__name__)
_lock = threading.Lock()
_forensic_cache: Dict[str, dict] = {}


def _query_abuseipdb(ip: str) -> dict:
    if not settings.abuseipdb_api_key:
        return {}
    try:
        resp = requests.get(
            "https://api.abuseipdb.com/api/v2/check",
            headers={"Key": settings.abuseipdb_api_key, "Accept": "application/json"},
            params={"ipAddress": ip, "maxAgeInDays": 90},
            timeout=8,
        )
        if resp.status_code == 200:
            data = resp.json().get("data", {})
            return {
                "abuse_score": data.get("abuseConfidenceScore", 0),
                "country_code": data.get("countryCode", "??"),
                "isp": data.get("isp", "Desconocido"),
                "domain": data.get("domain", ""),
                "total_reports": data.get("totalReports", 0),
            }
    except Exception as exc:
        logger.warning("AbuseIPDB error para %s: %s", ip, exc)
    return {}


def _query_whois(ip: str) -> dict:
    try:
        info = whois.whois(ip)
        org = info.get("org") or info.get("registrant_org") or "Desconocido"
        emails = info.get("emails")
        if isinstance(emails, list):
            abuse_email = next(
                (e for e in emails if "abuse" in e.lower()), emails[0] if emails else "N/A"
            )
        else:
            abuse_email = emails or "N/A"
        country = info.get("country") or "??"
        asn = info.get("asn") or info.get("asn_description") or "N/A"
        return {"org": str(org), "abuse_email": str(abuse_email),
                "country": str(country), "asn": str(asn)}
    except Exception as exc:
        logger.warning("WHOIS error para %s: %s", ip, exc)
        return {"org": "Error WHOIS", "abuse_email": "N/A", "country": "??", "asn": "N/A"}


def run_forensic(ip: str, threat_type: str = "Desconocido") -> dict:
    """Ejecuta análisis forense completo de una IP y envía reporte al administrador."""
    with _lock:
        if ip in _forensic_cache:
            return _forensic_cache[ip]

    logger.info("Iniciando análisis forense para IP: %s", ip)
    whois_data = _query_whois(ip)
    abuse_data = _query_abuseipdb(ip)

    try:
        hostname = socket.gethostbyaddr(ip)[0]
    except Exception:
        hostname = "Sin resolución inversa"

    report = {
        "ip": ip,
        "hostname": hostname,
        "threat_type": threat_type,
        "org": whois_data.get("org", "Desconocido"),
        "abuse_email": whois_data.get("abuse_email", "N/A"),
        "country": whois_data.get("country", "??"),
        "asn": whois_data.get("asn", "N/A"),
        "abuse_score": abuse_data.get("abuse_score"),
        "isp": abuse_data.get("isp", ""),
        "total_reports": abuse_data.get("total_reports", 0),
        "analyzed_at": datetime.now().isoformat(),
        "email_sent": False,
    }

    report["email_sent"] = alert_forensic_report(
        ip=ip,
        abuse_email=report["abuse_email"],
        org=report["org"],
        country=report["country"],
        asn=report["asn"],
        threat_type=threat_type,
    )

    with _lock:
        _forensic_cache[ip] = report
    return report


def get_cached_reports() -> list:
    with _lock:
        return list(_forensic_cache.values())


def get_report(ip: str) -> Optional[dict]:
    with _lock:
        return _forensic_cache.get(ip)


def delete_report(ip: str) -> bool:
    with _lock:
        if ip in _forensic_cache:
            del _forensic_cache[ip]
            return True
    return False


def clear_all_reports() -> None:
    with _lock:
        _forensic_cache.clear()
