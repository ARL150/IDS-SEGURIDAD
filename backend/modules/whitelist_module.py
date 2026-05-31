"""
IDS Institucional - Módulo de Listas Blancas (Capa 2 y 3)
Valida IP y MAC autorizadas; dispara alertas ante dispositivos desconocidos
"""
import json
import logging
import threading
from datetime import datetime
from typing import Optional

from config import settings
from modules.alerts import alert_unauthorized_device

logger = logging.getLogger(__name__)
_lock = threading.Lock()


def _load_whitelist() -> dict:
    try:
        with open(settings.whitelist_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"devices": []}


def _save_whitelist(data: dict) -> None:
    with open(settings.whitelist_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def get_all_devices() -> list[dict]:
    return _load_whitelist().get("devices", [])


def is_authorized(ip: str, mac: Optional[str] = None) -> bool:
    devices = get_all_devices()
    for dev in devices:
        if dev["ip"] == ip:
            if mac and dev.get("mac") and dev["mac"].upper() != mac.upper():
                return False
            return dev.get("authorized", True)
    return False


def add_device(ip: str, mac: str, label: str = "", authorized: bool = True) -> dict:
    with _lock:
        data = _load_whitelist()
        for dev in data["devices"]:
            if dev["ip"] == ip:
                dev.update({"mac": mac, "label": label, "authorized": authorized})
                _save_whitelist(data)
                return dev
        new_dev = {"ip": ip, "mac": mac, "label": label, "authorized": authorized}
        data["devices"].append(new_dev)
        _save_whitelist(data)
        return new_dev


def remove_device(ip: str) -> bool:
    with _lock:
        data = _load_whitelist()
        original = len(data["devices"])
        data["devices"] = [d for d in data["devices"] if d["ip"] != ip]
        if len(data["devices"]) < original:
            _save_whitelist(data)
            return True
    return False


def check_packet(ip: str, mac: str, packets_count: int = 1) -> dict:
    """Verifica un paquete y emite alerta si el dispositivo no está autorizado."""
    authorized = is_authorized(ip, mac)
    result = {
        "ip": ip,
        "mac": mac,
        "authorized": authorized,
        "timestamp": datetime.now().isoformat(),
        "alert_sent": False,
    }
    if not authorized:
        logger.warning("Dispositivo NO autorizado: IP=%s MAC=%s", ip, mac)
        result["alert_sent"] = alert_unauthorized_device(ip, mac, packets_count)
    return result
