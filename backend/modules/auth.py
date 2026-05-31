"""
IDS Institucional - Módulo de Autenticación
JWT con firma HS256 + contraseñas hasheadas con bcrypt.
Las credenciales nunca se almacenan en texto plano.
"""
import json
import logging
import threading
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from config import settings

logger = logging.getLogger(__name__)

USERS_FILE = Path(__file__).parent.parent / "data" / "users.json"
ALGORITHM = "HS256"

_lock = threading.Lock()


# ─── Utilidades de contraseña (bcrypt directo) ─────────────
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ─── Almacenamiento de usuarios ────────────────────────────
def _load_users() -> dict:
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"users": []}


def _save_users(data: dict) -> None:
    USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _ensure_default_users() -> None:
    """Crea los usuarios por defecto si no existe ninguno."""
    data = _load_users()
    if not data["users"]:
        data["users"] = [
            {
                "id": str(uuid.uuid4()),
                "username": "admin",
                "password_hash": hash_password("Admin"),
                "role": "admin",
                "name": "Administrador",
                "email": "admin@ids.local",
                "active": True,
                "created_at": datetime.utcnow().isoformat(),
            },
            {
                "id": str(uuid.uuid4()),
                "username": "operador",
                "password_hash": hash_password("Operador123"),
                "role": "operator",
                "name": "Operador de Red",
                "email": "operador@ids.local",
                "active": True,
                "created_at": datetime.utcnow().isoformat(),
            },
        ]
        _save_users(data)
        logger.info("Usuarios por defecto creados (admin/Admin, operador/Operador123)")


_ensure_default_users()


def get_all_users() -> list:
    data = _load_users()
    return [
        {k: v for k, v in u.items() if k != "password_hash"}
        for u in data["users"]
    ]


def get_user_by_username(username: str) -> Optional[dict]:
    for u in _load_users()["users"]:
        if u["username"].lower() == username.lower():
            return u
    return None


def create_user(username: str, password: str, name: str,
                email: str, role: str = "operator") -> dict:
    with _lock:
        data = _load_users()
        if any(u["username"].lower() == username.lower() for u in data["users"]):
            raise ValueError(f"El usuario '{username}' ya existe")
        new_user = {
            "id": str(uuid.uuid4()),
            "username": username,
            "password_hash": hash_password(password),
            "role": role,
            "name": name,
            "email": email,
            "active": True,
            "created_at": datetime.utcnow().isoformat(),
        }
        data["users"].append(new_user)
        _save_users(data)
        return {k: v for k, v in new_user.items() if k != "password_hash"}


def update_user_password(username: str, new_password: str) -> bool:
    with _lock:
        data = _load_users()
        for u in data["users"]:
            if u["username"].lower() == username.lower():
                u["password_hash"] = hash_password(new_password)
                _save_users(data)
                return True
    return False


def toggle_user_active(user_id: str) -> Optional[dict]:
    with _lock:
        data = _load_users()
        for u in data["users"]:
            if u["id"] == user_id:
                u["active"] = not u["active"]
                _save_users(data)
                return {k: v for k, v in u.items() if k != "password_hash"}
    return None


def delete_user(user_id: str) -> bool:
    with _lock:
        data = _load_users()
        before = len(data["users"])
        data["users"] = [u for u in data["users"] if u["id"] != user_id]
        if len(data["users"]) < before:
            _save_users(data)
            return True
    return False


# ─── JWT ───────────────────────────────────────────────────
def create_access_token(user: dict) -> str:
    payload = {
        "sub": user["username"],
        "id": user["id"],
        "role": user["role"],
        "name": user["name"],
        "exp": datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.api_secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.api_secret_key, algorithms=[ALGORITHM])
    except JWTError as exc:
        logger.warning("Token inválido: %s", exc)
        return None


def authenticate(username: str, password: str) -> Optional[dict]:
    user = get_user_by_username(username)
    if not user:
        return None
    if not user.get("active", True):
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return user
