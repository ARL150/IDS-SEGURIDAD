"""
IDS Institucional - Servidor principal (FastAPI + Scapy)
Licencia: GPL-3.0
Autenticación: JWT con firma HS256 + contraseñas bcrypt
"""
import asyncio
import json
import logging
import threading
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from config import settings
from modules import whitelist_module, site_monitor, threat_intel, forensics
from modules.device_info import lookup, infer_from_hostname
from modules.auth import (
    authenticate, create_access_token, create_user,
    decode_token, delete_user, get_all_users, toggle_user_active,
    update_user_password,
)

# ─── Captura de paquetes con Scapy ────────────────────────────────────────────
try:
    from scapy.all import sniff, IP, IPv6, TCP, UDP, ICMP, DNS, DNSQR, Ether, ARP
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="IDS Institucional", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Auth dependency ───────────────────────────────────────────────────────────
_bearer = HTTPBearer()


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    payload = decode_token(creds.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    return user


# ─── Estado global del sistema ─────────────────────────────────────────────────
_system_state: Dict[str, Any] = {
    "running": False,
    "packets_captured": 0,
    "start_time": None,
    "interface": settings.network_interface,
    "error": None,
}
_sniffer_thread: Optional[threading.Thread] = None
_detected_devices: Dict[str, dict] = {}
_alert_log: List[dict] = []
_packet_log: List[dict] = []
_packet_lock = threading.Lock()
_packet_counter = 0


# ─── Procesamiento de paquetes ─────────────────────────────────────────────────
def _get_protocol(pkt) -> str:
    if not SCAPY_AVAILABLE:
        return "UNKNOWN"
    if pkt.haslayer(DNS):
        return "DNS"
    if pkt.haslayer(TCP):
        dport = pkt[TCP].dport
        sport = pkt[TCP].sport
        if 80 in (dport, sport):   return "HTTP"
        if 443 in (dport, sport):  return "HTTPS"
        if 22 in (dport, sport):   return "SSH"
        if 21 in (dport, sport):   return "FTP"
        if 25 in (dport, sport) or 587 in (dport, sport): return "SMTP"
        return "TCP"
    if pkt.haslayer(UDP):
        dport = pkt[UDP].dport
        sport = pkt[UDP].sport
        if 53 in (dport, sport):   return "DNS"
        if 67 in (dport, sport) or 68 in (dport, sport): return "DHCP"
        if 123 in (dport, sport):  return "NTP"
        return "UDP"
    if pkt.haslayer(ICMP):        return "ICMP"
    if pkt.haslayer(ARP):         return "ARP"
    return "OTHER"


def _get_info(pkt, protocol: str) -> str:
    try:
        if protocol == "DNS" and pkt.haslayer(DNSQR):
            domain = pkt[DNSQR].qname.decode("utf-8", errors="ignore").rstrip(".")
            return f"Query: {domain}"
        if protocol in ("TCP", "HTTP", "HTTPS", "SSH", "FTP", "SMTP"):
            flags = pkt[TCP].sprintf("%flags%") if SCAPY_AVAILABLE and pkt.haslayer(TCP) else ""
            sport = pkt[TCP].sport
            dport = pkt[TCP].dport
            return f"{sport} → {dport}  [{flags}]"
        if protocol in ("UDP", "DHCP", "NTP"):
            sport = pkt[UDP].sport
            dport = pkt[UDP].dport
            return f"{sport} → {dport}"
        if protocol == "ICMP":
            icmp_type = pkt[ICMP].type if SCAPY_AVAILABLE else 0
            return "Echo request" if icmp_type == 8 else "Echo reply" if icmp_type == 0 else f"Type {icmp_type}"
        if protocol == "ARP":
            return f"Who has {pkt[ARP].pdst}?" if SCAPY_AVAILABLE else "ARP"
    except Exception:
        pass
    return ""


def _process_packet(pkt) -> None:
    global _packet_counter
    _system_state["packets_captured"] += 1
    src_ip = dst_ip = src_mac = dst_mac = ""
    length = len(pkt) if pkt else 0

    if SCAPY_AVAILABLE and pkt.haslayer(Ether):
        src_mac = pkt[Ether].src
        dst_mac = pkt[Ether].dst

    if SCAPY_AVAILABLE and pkt.haslayer(IP):
        src_ip = pkt[IP].src
        dst_ip = pkt[IP].dst

        if src_ip and not src_ip.startswith("127."):
            if src_ip not in _detected_devices:
                authorized = whitelist_module.is_authorized(src_ip, src_mac)
                _detected_devices[src_ip] = {
                    "ip": src_ip, "mac": src_mac, "authorized": authorized,
                    "first_seen": datetime.now().isoformat(),
                    "last_seen": datetime.now().isoformat(), "packets": 0,
                }
                if not authorized:
                    result = whitelist_module.check_packet(src_ip, src_mac, 1)
                    _add_alert("whitelist", f"Dispositivo no autorizado: {src_ip} ({src_mac})",
                               "danger", result["alert_sent"])
            _detected_devices[src_ip]["last_seen"] = datetime.now().isoformat()
            _detected_devices[src_ip]["packets"] += 1

        threat = threat_intel.check_ip(dst_ip, src_ip)
        if threat:
            _add_alert("threat", f"Amenaza: {src_ip} → {dst_ip} [{threat['threat_type']}]",
                       "critical", threat["alert_sent"])
            threading.Thread(
                target=forensics.run_forensic,
                args=(dst_ip, threat["threat_type"]),
                daemon=True,
            ).start()

    if SCAPY_AVAILABLE and pkt.haslayer(DNS) and pkt.haslayer(DNSQR):
        try:
            domain = pkt[DNSQR].qname.decode("utf-8").rstrip(".")
            if domain and not domain.endswith(".local"):
                site_monitor.record_domain(domain, src_ip, "DNS")
        except Exception:
            pass

    # ── Guardar paquete en el log de tráfico ──
    protocol = _get_protocol(pkt)
    info = _get_info(pkt, protocol)
    _packet_counter += 1
    entry = {
        "no":        _packet_counter,
        "timestamp": datetime.now().isoformat(),
        "src_ip":    src_ip or "—",
        "dst_ip":    dst_ip or "—",
        "src_mac":   src_mac,
        "dst_mac":   dst_mac,
        "protocol":  protocol,
        "length":    length,
        "info":      info,
        "flagged":   bool(src_ip and not whitelist_module.is_authorized(src_ip, src_mac)),
    }
    with _packet_lock:
        _packet_log.append(entry)
        if len(_packet_log) > 2000:
            _packet_log.pop(0)


def _sniffer_loop() -> None:
    logger.info("Iniciando captura en interfaz: %s", settings.network_interface)
    try:
        sniff(
            iface=settings.network_interface,
            prn=_process_packet,
            store=False,
            stop_filter=lambda _: not _system_state["running"],
        )
    except PermissionError:
        msg = "Sin permisos para capturar paquetes. Reinicia el backend con: sudo python3 main.py"
        logger.error(msg)
        _system_state["running"] = False
        _system_state["error"] = msg
    except OSError as exc:
        if "No such device" in str(exc) or "ENXIO" in str(exc) or "No existe" in str(exc):
            msg = f"Interfaz '{settings.network_interface}' no encontrada. Edita NETWORK_INTERFACE en .env"
            logger.error(msg)
            _system_state["error"] = msg
        else:
            logger.error("Error en sniffer: %s", exc)
            _system_state["error"] = str(exc)
        _system_state["running"] = False
    except Exception as exc:
        logger.error("Error en sniffer: %s", exc)
        _system_state["running"] = False
        _system_state["error"] = str(exc)


def _add_alert(alert_type: str, message: str, severity: str, email_sent: bool) -> None:
    entry = {
        "id": f"{time.time():.0f}",
        "timestamp": datetime.now().isoformat(),
        "type": alert_type, "message": message,
        "severity": severity, "email_sent": email_sent,
    }
    _alert_log.append(entry)
    if len(_alert_log) > 500:
        _alert_log.pop(0)


# ─── Modelos Pydantic ──────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class DeviceCreate(BaseModel):
    ip: str
    mac: str
    label: str = ""
    authorized: bool = True


class ThreatCreate(BaseModel):
    ip: str
    threat_type: str
    severity: str = "high"
    description: str = ""


class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    email: str
    role: str = "operator"


class PasswordChange(BaseModel):
    username: str
    new_password: str


# ══════════════════════════════════════════════════════════════
# ENDPOINTS PÚBLICOS (sin auth)
# ══════════════════════════════════════════════════════════════

@app.post("/api/auth/login")
def login(body: LoginRequest):
    user = authenticate(body.username, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    token = create_access_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
        },
    }


# ══════════════════════════════════════════════════════════════
# ENDPOINTS PROTEGIDOS
# ══════════════════════════════════════════════════════════════

@app.get("/api/auth/me")
def me(user: dict = Depends(get_current_user)):
    return user


# ── Gestión de usuarios (solo admin) ──────────────────────────
@app.get("/api/auth/users")
def list_users(_: dict = Depends(require_admin)):
    return get_all_users()


@app.post("/api/auth/users", status_code=201)
def add_user(body: UserCreate, _: dict = Depends(require_admin)):
    try:
        return create_user(body.username, body.password, body.name, body.email, body.role)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.patch("/api/auth/users/{user_id}/toggle")
def toggle_user(user_id: str, current: dict = Depends(require_admin)):
    if user_id == current["id"]:
        raise HTTPException(400, "No puedes desactivar tu propia cuenta")
    result = toggle_user_active(user_id)
    if not result:
        raise HTTPException(404, "Usuario no encontrado")
    return result


@app.delete("/api/auth/users/{user_id}")
def remove_user(user_id: str, current: dict = Depends(require_admin)):
    if user_id == current["id"]:
        raise HTTPException(400, "No puedes eliminar tu propia cuenta")
    if not delete_user(user_id):
        raise HTTPException(404, "Usuario no encontrado")
    return {"message": "Usuario eliminado"}


@app.post("/api/auth/change-password")
def change_password(body: PasswordChange, current: dict = Depends(get_current_user)):
    if current["role"] != "admin" and current["sub"] != body.username:
        raise HTTPException(403, "Solo puedes cambiar tu propia contraseña")
    if not update_user_password(body.username, body.new_password):
        raise HTTPException(404, "Usuario no encontrado")
    return {"message": "Contraseña actualizada"}


# ── Sistema ────────────────────────────────────────────────────
@app.get("/api/status")
def get_status(_: dict = Depends(get_current_user)):
    uptime = ""
    if _system_state["start_time"]:
        secs = int(time.time() - _system_state["start_time"])
        h, m, s = secs // 3600, (secs % 3600) // 60, secs % 60
        uptime = f"{h:02d}:{m:02d}:{s:02d}"
    import os
    return {
        "running": _system_state["running"],
        "packets_captured": _system_state["packets_captured"],
        "interface": _system_state["interface"],
        "uptime": uptime,
        "active_devices": len(_detected_devices),
        "threats_detected": threat_intel.get_stats()["total_events"],
        "alerts_sent": sum(1 for a in _alert_log if a["email_sent"]),
        "scapy_available": SCAPY_AVAILABLE,
        "has_root": os.getuid() == 0,
        "capture_error": _system_state.get("error"),
    }


@app.post("/api/start")
def start_capture(_: dict = Depends(require_admin)):
    global _sniffer_thread
    if _system_state["running"]:
        return {"message": "Captura ya en ejecución"}
    if not SCAPY_AVAILABLE:
        raise HTTPException(503, "Scapy no disponible. Instala con: pip install scapy")
    import os
    if os.getuid() != 0:
        raise HTTPException(403,
            "Se requieren permisos de root para capturar paquetes. "
            "Detén el backend y ejecútalo con: sudo python3 main.py")
    _system_state["running"] = True
    _system_state["start_time"] = time.time()
    _system_state["error"] = None
    _sniffer_thread = threading.Thread(target=_sniffer_loop, daemon=True)
    _sniffer_thread.start()
    return {"message": "Captura iniciada", "interface": settings.network_interface}


@app.post("/api/stop")
def stop_capture(_: dict = Depends(require_admin)):
    _system_state["running"] = False
    return {"message": "Captura detenida"}


# ── Dispositivos / Lista blanca ────────────────────────────────
@app.get("/api/devices")
def get_devices(_: dict = Depends(get_current_user)):
    whitelist = {d["ip"]: d for d in whitelist_module.get_all_devices()}
    devices = []
    for ip, dev in _detected_devices.items():
        wl = whitelist.get(ip, {})
        devices.append({**dev, "label": wl.get("label", ""), "in_whitelist": ip in whitelist})
    for ip, wl_dev in whitelist.items():
        if ip not in _detected_devices:
            devices.append({
                "ip": ip, "mac": wl_dev.get("mac", ""), "authorized": True,
                "label": wl_dev.get("label", ""), "in_whitelist": True,
                "last_seen": "Nunca", "packets": 0,
            })
    return devices


@app.get("/api/whitelist")
def get_whitelist(_: dict = Depends(get_current_user)):
    return whitelist_module.get_all_devices()


@app.post("/api/whitelist")
def add_to_whitelist(device: DeviceCreate, _: dict = Depends(get_current_user)):
    return whitelist_module.add_device(device.ip, device.mac, device.label, device.authorized)


@app.delete("/api/whitelist/{ip}")
def remove_from_whitelist(ip: str, _: dict = Depends(require_admin)):
    if whitelist_module.remove_device(ip):
        return {"message": f"{ip} eliminado"}
    raise HTTPException(404, f"IP {ip} no encontrada")


# ── Monitoreo de dominios ──────────────────────────────────────
@app.get("/api/domains")
def get_domains(limit: int = 100, _: dict = Depends(get_current_user)):
    return {
        "recent": site_monitor.get_recent_visits(limit),
        "top": site_monitor.get_top_domains(20),
        "stats": site_monitor.get_stats(),
    }


# ── Amenazas ───────────────────────────────────────────────────
@app.get("/api/threats")
def get_threats(_: dict = Depends(get_current_user)):
    return {
        "events": threat_intel.get_threat_events(50),
        "blacklist": threat_intel.get_blacklist(),
        "stats": threat_intel.get_stats(),
    }


@app.post("/api/threats/blacklist")
def add_blacklist_entry(threat: ThreatCreate, _: dict = Depends(require_admin)):
    return threat_intel.add_to_blacklist(
        threat.ip, threat.threat_type, threat.severity, threat.description
    )


# ── Forense ────────────────────────────────────────────────────
@app.get("/api/forensics")
def get_forensic_reports(_: dict = Depends(get_current_user)):
    return forensics.get_cached_reports()


@app.post("/api/forensics/{ip}")
def run_forensic_analysis(ip: str, threat_type: str = "Desconocido",
                           _: dict = Depends(get_current_user)):
    return forensics.run_forensic(ip, threat_type)


@app.delete("/api/forensics")
def clear_all_forensics(_: dict = Depends(require_admin)):
    forensics.clear_all_reports()
    return {"message": "Todos los reportes forenses eliminados"}


@app.delete("/api/forensics/{ip}")
def delete_forensic_report(ip: str, _: dict = Depends(require_admin)):
    if not forensics.delete_report(ip):
        raise HTTPException(404, f"Reporte para {ip} no encontrado")
    return {"message": f"Reporte de {ip} eliminado"}


# ── Escáner de red ─────────────────────────────────────────────
_scan_lock   = threading.Lock()
_last_scan:  List[dict] = []
_scan_status: Dict[str, Any] = {"scanning": False, "last_run": None, "network": ""}


@app.get("/api/network/scan")
def get_scan_results(_: dict = Depends(get_current_user)):
    return {"devices": _last_scan, "status": _scan_status}


@app.post("/api/network/scan")
def start_network_scan(_: dict = Depends(get_current_user)):
    if _scan_status["scanning"]:
        return {"message": "Escaneo ya en progreso..."}
    if not SCAPY_AVAILABLE:
        raise HTTPException(503, "Scapy no disponible")
    import os
    if os.getuid() != 0:
        raise HTTPException(403,
            "Se requieren permisos root para escanear. Reinicia con: sudo python3 main.py")

    def _do_scan():
        import subprocess, socket
        from scapy.all import ARP, Ether, srp
        _scan_status["scanning"] = True
        try:
            r = subprocess.run(
                ["ipconfig", "getifaddr", settings.network_interface],
                capture_output=True, text=True
            )
            local_ip = r.stdout.strip() or "192.168.1.100"
            prefix = ".".join(local_ip.split(".")[:3]) + ".0/24"
            _scan_status["network"] = prefix

            pkt = Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=prefix)
            answered, _ = srp(pkt, timeout=4, verbose=0, iface=settings.network_interface)

            whitelist = {d["ip"]: d for d in whitelist_module.get_all_devices()}
            devices = []
            for _, rcv in answered:
                ip, mac = rcv.psrc, rcv.hwsrc
                try:    hostname = socket.gethostbyaddr(ip)[0]
                except: hostname = ""
                vendor, dtype, emoji, type_label = lookup(mac)
                emoji2, _, display_name = infer_from_hostname(hostname, vendor, dtype)
                wl = whitelist.get(ip, {})
                devices.append({
                    "ip":          ip,
                    "mac":         mac,
                    "hostname":    hostname,
                    "authorized":  whitelist_module.is_authorized(ip, mac),
                    "label":       wl.get("label", ""),
                    "vendor":      vendor,
                    "device_type": dtype,
                    "emoji":       emoji2 or emoji,
                    "type_label":  display_name,
                })
            devices.sort(key=lambda d: [int(x) for x in d["ip"].split(".")])
            with _scan_lock:
                _last_scan.clear()
                _last_scan.extend(devices)
            _scan_status["last_run"] = datetime.now().isoformat()
        except Exception as exc:
            logger.error("Error en escaneo: %s", exc)
        finally:
            _scan_status["scanning"] = False

    threading.Thread(target=_do_scan, daemon=True).start()
    return {"message": "Escaneo iniciado"}




# ── Alertas ────────────────────────────────────────────────────
@app.get("/api/alerts")
def get_alerts(limit: int = 100, _: dict = Depends(get_current_user)):
    return list(reversed(_alert_log[-limit:]))


# ── Tráfico de paquetes ────────────────────────────────────────
@app.get("/api/packets")
def get_packets(limit: int = 200, protocol: str = "", _: dict = Depends(get_current_user)):
    with _packet_lock:
        pkts = list(reversed(_packet_log))
    if protocol:
        pkts = [p for p in pkts if p["protocol"] == protocol.upper()]
    return pkts[:limit]


@app.delete("/api/packets")
def clear_packets(_: dict = Depends(require_admin)):
    global _packet_counter
    with _packet_lock:
        _packet_log.clear()
        _packet_counter = 0
    return {"message": "Log de paquetes limpiado"}


# ── Configuración ──────────────────────────────────────────────
@app.get("/api/config")
def get_config(_: dict = Depends(get_current_user)):
    return {
        "admin_email": settings.admin_email,
        "network_interface": settings.network_interface,
        "smtp_host": settings.smtp_host,
        "smtp_port": settings.smtp_port,
        "smtp_configured": bool(settings.smtp_user and settings.smtp_password),
        "abuseipdb_configured": bool(settings.abuseipdb_api_key),
    }


# ── WebSocket ──────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    token = ws.query_params.get("token", "")
    payload = decode_token(token)
    if not payload:
        await ws.close(code=4001)
        return
    await ws.accept()
    try:
        while True:
            data = json.dumps({
                "type": "status",
                "data": {
                    "running": _system_state["running"],
                    "packets": _system_state["packets_captured"],
                    "threats": threat_intel.get_stats()["total_events"],
                    "alerts": len(_alert_log),
                    "timestamp": datetime.now().isoformat(),
                },
            })
            await ws.send_text(data)
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.backend_port, reload=False)
