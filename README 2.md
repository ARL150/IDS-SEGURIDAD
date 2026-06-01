# 🛡️ IDS Institucional

**Sistema de Detección de Intrusos (IDS) para infraestructuras educativas**  
Desarrollado con React 19 + TypeScript (frontend) y FastAPI + Python (backend).  
Licencia: [GNU GPL v3.0](https://www.gnu.org/licenses/gpl-3.0.html)

---

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Módulos Funcionales](#módulos-funcionales)
5. [Requisitos del Sistema](#requisitos-del-sistema)
6. [Instalación y Configuración](#instalación-y-configuración)
7. [Variables de Entorno](#variables-de-entorno)
8. [Ejecución](#ejecución)
9. [Usuarios por Defecto](#usuarios-por-defecto)
10. [Capturas de Pantalla](#capturas-de-pantalla)
11. [API — Endpoints](#api--endpoints)
12. [Seguridad Implementada](#seguridad-implementada)

---

## Descripción General

El **IDS Institucional** es una herramienta de monitoreo de red en tiempo real que permite:

- Detectar dispositivos **no autorizados** en la red (Capa 2 y 3 OSI)
- Monitorear el **tráfico DNS/HTTP** y generar bitácoras de dominios visitados
- Cruzar conexiones salientes contra la **lista negra Feodo Tracker** (abuse.ch) de servidores C2 de botnets activos (Emotet, TrickBot, QakBot, Dridex, etc.)
- Ejecutar **análisis forense automatizado** (WHOIS/AbuseIPDB) ante una amenaza detectada
- Enviar **correos de alerta** al administrador en tiempo real
- Gestionar usuarios con roles (Admin / Operador) mediante autenticación JWT

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19)                  │
│  Puerto 5173 (dev) · Vite · TypeScript · Recharts       │
│                                                         │
│  Dashboard │ Lista Blanca │ Lista Negra │ Forense        │
│  Tráfico   │ Sitios       │ Alertas    │ Configuración  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / WebSocket
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI)                     │
│  Puerto 8000 · Python 3.11+ · JWT HS256 · bcrypt        │
│                                                         │
│  main.py ── Sniffer (Scapy) ─── Packet Handler          │
│      │                                                  │
│      ├── modules/whitelist_module.py  (Capa 2/3)        │
│      ├── modules/blacklist.py         (Feodo Tracker)   │
│      ├── modules/threat_intel.py      (IPs peligrosas)  │
│      ├── modules/site_monitor.py      (DNS/HTTP log)    │
│      ├── modules/forensics.py         (WHOIS/Abuse)     │
│      ├── modules/alerts.py            (SMTP Gmail)      │
│      ├── modules/auth.py              (JWT + bcrypt)    │
│      └── modules/device_info.py       (OUI MAC lookup)  │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │        data/ (JSON)         │
        │  whitelist.json             │
        │  blacklist.json             │
        │  blacklist_manual.json      │
        │  feodo_cache.json           │
        │  users.json                 │
        └─────────────────────────────┘
```

**Capas OSI cubiertas:**
- **Capa 2 (Enlace):** Validación de direcciones MAC en lista blanca
- **Capa 3 (Red):** Validación de IPs, detección de amenazas, blacklist
- **Capa 7 (Aplicación):** Captura de consultas DNS y peticiones HTTP

---

## Estructura del Proyecto

```
PROYECTO/
├── README.md                        ← Este archivo
├── backend/                         ← API Python / FastAPI
│   ├── main.py                      ← Servidor principal + Sniffer Scapy
│   ├── config.py                    ← Configuración desde .env
│   ├── .env                         ← Credenciales (NO incluir en git)
│   ├── .env.example                 ← Plantilla de variables de entorno
│   ├── requirements.txt             ← Dependencias Python
│   ├── start.sh                     ← Script de inicio (Linux/macOS)
│   ├── modules/
│   │   ├── __init__.py
│   │   ├── alerts.py                ← Envío de correos SMTP (Gmail)
│   │   ├── auth.py                  ← JWT, bcrypt, gestión de usuarios
│   │   ├── blacklist.py             ← Feodo Tracker + lista negra manual
│   │   ├── device_info.py           ← Lookup OUI/MAC → tipo de dispositivo
│   │   ├── forensics.py             ← WHOIS + AbuseIPDB automatizado
│   │   ├── site_monitor.py          ← Bitácora DNS/HTTP en tiempo real
│   │   ├── threat_intel.py          ← Motor de detección de amenazas
│   │   └── whitelist_module.py      ← Lista blanca IP/MAC autorizada
│   └── data/
│       ├── whitelist.json           ← Dispositivos autorizados
│       ├── blacklist.json           ← IPs peligrosas (threat intel)
│       ├── blacklist_manual.json    ← IPs agregadas manualmente
│       ├── feodo_cache.json         ← Caché Feodo Tracker (6h TTL)
│       └── users.json               ← Usuarios del sistema (hash bcrypt)
│
└── ids/                             ← Interfaz web (React + Vite)
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── package.json
    └── src/
        ├── App.tsx                  ← Raíz de la aplicación
        ├── main.tsx
        ├── index.css                ← Temas y estilos globales
        ├── App.css
        ├── types/
        │   └── index.ts             ← Interfaces TypeScript compartidas
        ├── contexts/
        │   ├── AuthContext.tsx       ← Estado de autenticación + JWT
        │   └── ThemeContext.tsx      ← 6 temas de color (dark, light, etc.)
        ├── hooks/
        │   └── useApi.ts            ← Hook genérico para llamadas al backend
        └── components/
            ├── Login.tsx            ← Pantalla de inicio de sesión
            ├── Sidebar.tsx          ← Navegación lateral
            ├── Dashboard.tsx        ← Panel principal con gráficas
            ├── WhitelistModule.tsx  ← Gestión de lista blanca
            ├── BlacklistModule.tsx  ← Lista negra + Feodo Tracker UI
            ├── PacketMonitor.tsx    ← Monitor de paquetes en vivo
            ├── SiteMonitor.tsx      ← Bitácora de dominios visitados
            ├── ThreatIntel.tsx      ← Inteligencia de amenazas
            ├── Forensics.tsx        ← Reportes forenses automatizados
            ├── AlertLog.tsx         ← Historial de alertas
            ├── Settings.tsx         ← Configuración + prueba de correo
            ├── UserManagement.tsx   ← CRUD de usuarios (solo admin)
            └── NetworkScanner.tsx   ← Escáner de red ARP
```

---

## Módulos Funcionales

### 1. Lista Blanca — `whitelist_module.py`
Gestiona dispositivos IP/MAC autorizados en la red. Si un dispositivo no registrado genera tráfico, el sistema dispara automáticamente un correo de alerta al administrador. Soporta etiquetas personalizadas por dispositivo y estado de autorización.

### 2. Lista Negra + Feodo Tracker — `blacklist.py`
- Descarga y cachea (6 horas) el feed JSON de [Feodo Tracker (abuse.ch)](https://feodotracker.abuse.ch/downloads/ipblocklist.json): miles de IPs de servidores C2 de botnets activos (Emotet, Dridex, TrickBot, QakBot, BazarLoader, IcedID, Cobalt Strike)
- Permite agregar IPs manualmente con tipo de amenaza, severidad y descripción
- El sniffer cruza **cada paquete capturado** contra esta lista; al detectar una conexión envía correo de "Alerta de Emergencia" y activa análisis forense automático

### 3. Monitor de Sitios — `site_monitor.py`
Captura consultas DNS y peticiones HTTP en tiempo real. Genera bitácora paginada de dominios visitados con IP origen, timestamp y protocolo. Útil para auditorías de uso de red.

### 4. Inteligencia de Amenazas — `threat_intel.py`
Motor de detección que evalúa cada IP destino contra una base de patrones de amenazas conocidas. Categoriza el tipo de riesgo (botnet, C2, malware, phishing, etc.) y envía alertas de emergencia con descripción del riesgo.

### 5. Forense Automatizado — `forensics.py`
Ante una IP peligrosa detectada, ejecuta automáticamente:
- Consulta WHOIS para obtener organización, país, ASN
- Consulta AbuseIPDB para score de abuso y reportes previos
- Envía reporte completo por correo con contacto de abuso del proveedor para facilitar el reporte

### 6. Alertas SMTP — `alerts.py`
Envía correos HTML al administrador vía Gmail SMTP con TLS. Tres tipos de alerta:
- **Dispositivo no autorizado:** IP/MAC detectada fuera de lista blanca
- **Alerta de emergencia:** conexión a IP de amenaza conocida o Feodo C2
- **Reporte forense:** datos WHOIS/Abuse de IP analizada

### 7. Autenticación — `auth.py`
JWT (HS256) con expiración configurable. Contraseñas hasheadas con bcrypt. Dos roles: `admin` (acceso total) y `operator` (solo lectura). Gestión de usuarios persistida en JSON.

### 8. Identificación de Dispositivos — `device_info.py`
Base de datos OUI (prefijos MAC) de más de 300 fabricantes. Identifica automáticamente el tipo de dispositivo: 📱 iPhone/Android, 💻 Mac/Laptop/PC, 📡 Router, 🎮 Consola, 📺 Smart TV, 🏠 IoT, etc.

---

## Requisitos del Sistema

| Componente | Versión mínima |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |
| Sistema Operativo | Linux (recomendado), macOS |
| Permisos | `sudo` / root (para captura de paquetes con Scapy) |

### Dependencias Python (`backend/requirements.txt`)
```
fastapi==0.115.0
uvicorn[standard]==0.30.6
scapy==2.6.1
python-dotenv==1.0.1
requests==2.32.3
python-whois==0.9.4
websockets==13.1
pydantic==2.9.2
python-jose[cryptography]==3.3.0
bcrypt==4.2.1
```

### Dependencias Frontend
```
react 19, typescript, vite, recharts, lucide-react, sonner
```

---

## Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/ARL150/IDS-SEGURIDAD.git
cd IDS-SEGURIDAD
```

### 2. Configurar el Backend

```bash
cd backend

# Crear entorno virtual
python3 -m venv venv
source venv/bin/activate          # Linux/macOS
# venv\Scripts\activate           # Windows

# Instalar dependencias
pip install -r requirements.txt

# Copiar y editar variables de entorno
cp .env.example .env
nano .env                          # Completar credenciales
```

### 3. Configurar el Frontend

```bash
cd ../ids
npm install
```

---

## Variables de Entorno

Edita `backend/.env` con tus valores reales. **Nunca subas este archivo a Git.**

```env
# Correo destinatario de alertas (el administrador)
ADMIN_EMAIL=tu_correo@gmail.com

# Cuenta Gmail desde la que se envían los correos
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=remitente@gmail.com
# Contraseña de Aplicación Google (NO tu contraseña normal)
# Generar en: https://myaccount.google.com/apppasswords
SMTP_PASSWORD=xxxx_xxxx_xxxx_xxxx

# Interfaz de red a monitorear
# Linux: eth0, wlan0  |  macOS: en0, en1
NETWORK_INTERFACE=en0

# Clave secreta para JWT (mínimo 32 caracteres aleatorios)
API_SECRET_KEY=cambia_esta_clave_secreta_32chars

# Puerto del servidor backend
BACKEND_PORT=8000

# API Key de AbuseIPDB (gratuita en https://www.abuseipdb.com)
ABUSEIPDB_API_KEY=tu_api_key_aqui

# Intervalo de reporte en segundos
REPORT_INTERVAL=300
```

> **Cómo obtener la Contraseña de Aplicación de Google:**
> 1. Activa la verificación en 2 pasos en tu cuenta Google
> 2. Ve a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
> 3. Crea una nueva contraseña para "Correo" → "Otro (nombre personalizado)"
> 4. Copia los 16 caracteres generados en `SMTP_PASSWORD`

---

## Ejecución

### Backend (requiere permisos root para captura de paquetes)

```bash
cd backend
source venv/bin/activate
sudo python3 main.py
```

El servidor estará disponible en `http://localhost:8000`  
Documentación automática de la API: `http://localhost:8000/docs`

### Frontend (en otra terminal)

```bash
cd ids
npm run dev
```

La interfaz estará disponible en `http://localhost:5173`

---

## Usuarios por Defecto

| Usuario | Contraseña | Rol | Permisos |
|---|---|---|---|
| `admin` | `Admin` | Administrador | Acceso total: iniciar/detener captura, agregar/eliminar IPs, gestionar usuarios, forzar actualizaciones |
| `operador` | `Operador1` | Operador | Solo lectura: ver alertas, tráfico, reportes |
| `viewer` | `Viewer1` | Operador | Solo lectura |

> **Cambia las contraseñas por defecto** desde Configuración → Gestión de Usuarios antes de usar en producción.

---

## API — Endpoints

### Autenticación
| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/login` | Obtener token JWT |
| `GET` | `/api/me` | Usuario autenticado actual |

### Sistema
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/status` | Estado del sistema en tiempo real |
| `POST` | `/api/start` | Iniciar captura de paquetes |
| `POST` | `/api/stop` | Detener captura |
| `GET` | `/api/config` | Configuración del backend |
| `GET` | `/api/traffic-history` | Historial de tráfico (gráficas) |

### Lista Blanca
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/whitelist` | Listar dispositivos autorizados |
| `POST` | `/api/whitelist` | Agregar dispositivo |
| `DELETE` | `/api/whitelist/{ip}` | Eliminar dispositivo |
| `GET` | `/api/devices` | Dispositivos detectados en red |

### Lista Negra / Feodo Tracker
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/blacklist` | Listar IPs (feed + manual) con filtros |
| `POST` | `/api/blacklist` | Agregar IP manual (admin) |
| `DELETE` | `/api/blacklist/{ip}` | Eliminar IP manual (admin) |
| `POST` | `/api/blacklist/refresh` | Forzar actualización de Feodo (admin) |

### Amenazas / Forense
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/threats` | Historial de amenazas detectadas |
| `GET` | `/api/forensics` | Reportes forenses generados |
| `POST` | `/api/forensics/{ip}` | Ejecutar análisis forense manual |
| `DELETE` | `/api/forensics` | Limpiar todos los reportes (admin) |

### Alertas / Correo
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/alerts` | Historial de alertas |
| `POST` | `/api/alerts/test` | Enviar correo de prueba (admin) |

### WebSocket
| Endpoint | Descripción |
|---|---|
| `ws://localhost:8000/ws` | Stream en tiempo real de eventos |

---

## Seguridad Implementada

| Medida | Detalle |
|---|---|
| **Autenticación JWT** | Tokens HS256 con expiración configurable (default 8h) |
| **Contraseñas hasheadas** | bcrypt con salt automático |
| **Variables de entorno** | Credenciales SMTP y claves fuera del código fuente |
| **Control de roles** | Endpoints destructivos restringidos a `admin` |
| **Sin hardcoding** | Ninguna contraseña, API key ni clave secreta en el código |
| **CORS** | Configurado para aceptar solo el origen del frontend |
| **Caché Feodo** | Feed externo cacheado 6h para evitar dependencia en tiempo real |
| **Anti-spam de alertas** | `_feodo_alerted` evita duplicar correos por la misma IP |

---

## Tecnologías Utilizadas

**Frontend:**
- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — bundler
- [Recharts](https://recharts.org/) — gráficas
- [Lucide React](https://lucide.dev/) — íconos
- [Sonner](https://sonner.emilkowal.ski/) — notificaciones toast

**Backend:**
- [FastAPI](https://fastapi.tiangolo.com/) — framework REST
- [Scapy](https://scapy.net/) — captura y análisis de paquetes
- [python-jose](https://python-jose.readthedocs.io/) — JWT
- [bcrypt](https://pypi.org/project/bcrypt/) — hashing de contraseñas
- [python-dotenv](https://pypi.org/project/python-dotenv/) — variables de entorno

**APIs externas:**
- [Feodo Tracker (abuse.ch)](https://feodotracker.abuse.ch/) — feed de IPs C2 de botnets
- [AbuseIPDB](https://www.abuseipdb.com/) — score de abuso por IP
- [python-whois](https://pypi.org/project/python-whois/) — consultas WHOIS

---

## Licencia

Este proyecto se distribuye bajo la licencia **GNU General Public License v3.0**.  
Eres libre de usar, estudiar, modificar y distribuir este software bajo los mismos términos.  
Ver [LICENSE](https://www.gnu.org/licenses/gpl-3.0.html) para más detalles.

---

*IDS Institucional — Proyecto académico · Seguridad en Sistemas · 2025*
