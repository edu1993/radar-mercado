"""Interfaz común para cualquier fuente de e-commerce (Supermercados DIA%, Carrefour AR, Más Online, etc.)."""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List


class MarketplaceScraper(ABC):
    source_key: str
    source_name: str
    currency: str = "ARS"
    region: str = "AR"
    base_url: str = ""

    @classmethod
    def metadata(cls) -> Dict[str, Any]:
        return {
            "sourceKey": cls.source_key,
            "sourceName": cls.source_name,
            "currency": cls.currency,
            "region": cls.region,
            "baseUrl": cls.base_url,
        }

    def build_response(self, term: str, products: List[Dict[str, Any]], pages_read: int = 1) -> Dict[str, Any]:
        return {
            "term": term.strip(),
            "source": self.source_name,
            "sourceKey": self.source_key,
            "currency": self.currency,
            "capturedAt": datetime.now(timezone.utc).isoformat(),
            "pagesRead": pages_read,
            "totalProducts": len(products),
            "products": products,
        }

    @abstractmethod
    def search(self, term: str, limit: int = 150) -> Dict[str, Any]:
        raise NotImplementedError
