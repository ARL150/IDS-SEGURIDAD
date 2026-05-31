"""
IDS Institucional - Módulo de configuración
Lee variables de entorno desde .env (nunca credenciales hardcoded)
"""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")


class Settings:
    admin_email: str = os.getenv("ADMIN_EMAIL", "admin@empresa.com")
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    network_interface: str = os.getenv("NETWORK_INTERFACE", "eth0")
    api_secret_key: str = os.getenv("API_SECRET_KEY", "dev_key_CHANGE_in_production_32ch")
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))
    backend_port: int = int(os.getenv("BACKEND_PORT", "8000"))
    abuseipdb_api_key: str = os.getenv("ABUSEIPDB_API_KEY", "")
    report_interval: int = int(os.getenv("REPORT_INTERVAL", "300"))
    whitelist_path: Path = BASE_DIR / "data" / "whitelist.json"
    blacklist_path: Path = BASE_DIR / "data" / "blacklist.json"


settings = Settings()
