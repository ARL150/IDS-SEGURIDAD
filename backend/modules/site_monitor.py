"""
IDS Institucional - Módulo de Monitoreo de Sitios
Registra peticiones DNS/HTTP en tiempo real y genera reportes de dominios visitados
"""
import logging
import threading
from collections import defaultdict
from datetime import datetime
from typing import Dict, List

logger = logging.getLogger(__name__)
_lock = threading.Lock()

_domain_log: List[dict] = []
_domain_counts: Dict[str, int] = defaultdict(int)


def record_domain(domain: str, source_ip: str, query_type: str = "DNS") -> None:
    entry = {
        "domain": domain,
        "source_ip": source_ip,
        "timestamp": datetime.now().isoformat(),
        "type": query_type,
    }
    with _lock:
        _domain_log.append(entry)
        _domain_counts[domain] += 1
        if len(_domain_log) > 10_000:
            _domain_log.pop(0)


def get_recent_visits(limit: int = 100) -> List[dict]:
    with _lock:
        return list(reversed(_domain_log[-limit:]))


def get_top_domains(top: int = 20) -> List[dict]:
    with _lock:
        sorted_domains = sorted(
            _domain_counts.items(), key=lambda x: x[1], reverse=True
        )
        return [{"domain": d, "count": c} for d, c in sorted_domains[:top]]


def get_stats() -> dict:
    with _lock:
        return {
            "total_queries": len(_domain_log),
            "unique_domains": len(_domain_counts),
        }


def clear_log() -> None:
    with _lock:
        _domain_log.clear()
        _domain_counts.clear()
