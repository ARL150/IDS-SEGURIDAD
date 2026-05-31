"""
IDS Institucional - Módulo de alertas por correo
Usa SMTP con TLS; las credenciales vienen exclusivamente de variables de entorno
"""
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from typing import Optional

from config import settings

logger = logging.getLogger(__name__)


def _send_email(subject: str, body_html: str, to: Optional[str] = None) -> bool:
    recipient = to or settings.admin_email
    if not settings.smtp_user or not settings.smtp_password:
        logger.warning("SMTP no configurado - correo no enviado: %s", subject)
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_user
        msg["To"] = recipient
        msg.attach(MIMEText(body_html, "html", "utf-8"))
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_user, recipient, msg.as_string())
        logger.info("Alerta enviada a %s: %s", recipient, subject)
        return True
    except Exception as exc:
        logger.error("Error al enviar correo: %s", exc)
        return False


def alert_unauthorized_device(ip: str, mac: str, packets: int) -> bool:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    subject = f"[IDS] ⚠️ Dispositivo no autorizado detectado: {ip}"
    body = f"""
    <html><body style="font-family:monospace;background:#0d1117;color:#c9d1d9;padding:24px">
    <h2 style="color:#f85149">⚠️ ALERTA DE SEGURIDAD - Dispositivo No Autorizado</h2>
    <table border="1" cellpadding="8" style="border-collapse:collapse;color:#c9d1d9">
      <tr><td><b>Timestamp</b></td><td>{ts}</td></tr>
      <tr><td><b>IP detectada</b></td><td style="color:#f85149">{ip}</td></tr>
      <tr><td><b>MAC detectada</b></td><td style="color:#f85149">{mac}</td></tr>
      <tr><td><b>Paquetes capturados</b></td><td>{packets}</td></tr>
    </table>
    <p>Este dispositivo <b>no está en la lista blanca</b> del IDS institucional.<br>
    Verifique si el acceso es autorizado y tome las medidas correspondientes.</p>
    <p style="color:#8b949e;font-size:12px">IDS Institucional - Sistema Automático de Detección de Intrusos</p>
    </body></html>
    """
    return _send_email(subject, body)


def alert_threat_detected(source_ip: str, dest_ip: str, threat_type: str,
                           severity: str, description: str) -> bool:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    color = "#f85149" if severity == "critical" else "#e3b341"
    subject = f"[IDS] 🚨 ALERTA DE EMERGENCIA - {threat_type}: {dest_ip}"
    body = f"""
    <html><body style="font-family:monospace;background:#0d1117;color:#c9d1d9;padding:24px">
    <h2 style="color:{color}">🚨 ALERTA DE EMERGENCIA - Amenaza Detectada</h2>
    <table border="1" cellpadding="8" style="border-collapse:collapse;color:#c9d1d9">
      <tr><td><b>Timestamp</b></td><td>{ts}</td></tr>
      <tr><td><b>IP Origen</b></td><td>{source_ip}</td></tr>
      <tr><td><b>IP Destino (Amenaza)</b></td><td style="color:{color}">{dest_ip}</td></tr>
      <tr><td><b>Tipo de Riesgo</b></td><td style="color:{color}"><b>{threat_type}</b></td></tr>
      <tr><td><b>Severidad</b></td><td style="color:{color}">{severity.upper()}</td></tr>
      <tr><td><b>Descripción</b></td><td>{description}</td></tr>
    </table>
    <p>Se ha detectado comunicación con una <b>IP de amenaza conocida</b>.<br>
    Se recomienda aislar el dispositivo origen e iniciar investigación forense.</p>
    <p style="color:#8b949e;font-size:12px">IDS Institucional - Sistema Automático de Detección de Intrusos</p>
    </body></html>
    """
    return _send_email(subject, body)


def alert_forensic_report(ip: str, abuse_email: str, org: str, country: str,
                           asn: str, threat_type: str) -> bool:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    subject = f"[IDS] 🔍 Reporte Forense Automático - {ip}"
    body = f"""
    <html><body style="font-family:monospace;background:#0d1117;color:#c9d1d9;padding:24px">
    <h2 style="color:#58a6ff">🔍 Reporte Forense Automático</h2>
    <p>Se ha completado la consulta WHOIS/Abuse para la IP de amenaza <b style="color:#f85149">{ip}</b></p>
    <table border="1" cellpadding="8" style="border-collapse:collapse;color:#c9d1d9">
      <tr><td><b>Timestamp</b></td><td>{ts}</td></tr>
      <tr><td><b>IP Analizada</b></td><td style="color:#f85149">{ip}</td></tr>
      <tr><td><b>Tipo de Amenaza</b></td><td>{threat_type}</td></tr>
      <tr><td><b>Organización</b></td><td>{org}</td></tr>
      <tr><td><b>País</b></td><td>{country}</td></tr>
      <tr><td><b>ASN</b></td><td>{asn}</td></tr>
      <tr><td><b>Contacto de Abuso</b></td><td style="color:#58a6ff">{abuse_email}</td></tr>
    </table>
    <h3>Acción recomendada:</h3>
    <p>Puede reportar este abuso directamente enviando un correo a:
    <a href="mailto:{abuse_email}" style="color:#58a6ff">{abuse_email}</a></p>
    <p style="color:#8b949e;font-size:12px">IDS Institucional - Sistema Automático de Detección de Intrusos</p>
    </body></html>
    """
    return _send_email(subject, body)
