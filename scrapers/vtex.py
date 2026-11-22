#!/usr/bin/env python3
"""Adaptadores para supermercados argentinos sobre VTEX (DIA% Trenque Lauquen, Carrefour y Más Online)."""

import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional
from urllib.parse import quote, urlencode

import requests

from base import MarketplaceScraper
from preciosclaros import PreciosClarosTrenqueLauquenScraper
from relevance import compute_unit_price, extract_pack_size, matches_core_tokens, normalize_brand, parse_query_intent

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


def extract_vtex_offer(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Extrae el mejor precio disponible, precio de lista y descuento de un producto VTEX."""
    best_price: Optional[float] = None
    best_list_price: Optional[float] = None
    best_seller: Optional[str] = None
    unit_info: Optional[str] = None

    for sku in item.get("items") or []:
        measurement_unit = sku.get("measurementUnit")
        unit_multiplier = sku.get("unitMultiplier")
        if measurement_unit and unit_multiplier:
            unit_info = f"{unit_multiplier} {measurement_unit}"

        for seller in sku.get("sellers") or []:
            offer = seller.get("commertialOffer") or {}
            price = offer.get("Price")
            list_price = offer.get("ListPrice")
            if not isinstance(price, (int, float)) or price < 50:
                continue
            if best_price is None or price < best_price:
                best_price = float(price)
                best_list_price = (
                    float(list_price)
                    if isinstance(list_price, (int, float)) and list_price > best_price
                    else None
                )
                best_seller = seller.get("sellerName") or None

    if best_price is None:
        return None

    discount_pct = (
        round((1 - best_price / best_list_price) * 100)
        if best_list_price and best_list_price > best_price
        else 0
    )

    return {
        "price": best_price,
        "listPrice": best_list_price,
        "discountPct": discount_pct,
        "seller": best_seller,
        "unit": unit_info,
    }


class VtexSupermarketScraper(MarketplaceScraper):
    """Base reutilizable para cadenas de supermercados que exponen la Search API pública de VTEX."""

    currency = "ARS"
    region = "AR"
    page_size = 50

    def __init__(self, timeout: int = 15):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
            "Accept-Language": "es-AR,es;q=0.9",
        })

    def _fetch_page(self, term: str, start: int, end: int) -> List[Dict[str, Any]]:
        query = urlencode({"ft": term.strip(), "_from": start, "_to": end}, quote_via=quote)
        url = f"{self.base_url}/api/catalog_system/pub/products/search?{query}"
        resp = self.session.get(url, timeout=self.timeout)
        if resp.status_code not in (200, 206):
            resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, list) else []

    def search(self, term: str, limit: int = 100) -> Dict[str, Any]:
        limit = max(10, min(int(limit), 200))
        core_query, core_tokens, requested_size = parse_query_intent(term)
        products: List[Dict[str, Any]] = []
        seen_ids = set()
        pages_read = 0
        offset = 0

        while len(products) < limit and pages_read < 4:
            if pages_read > 0:
                time.sleep(0.2)
            end = offset + self.page_size - 1
            raw_items = self._fetch_page(core_query, offset, end)
            if not raw_items:
                break
            pages_read += 1

            added = 0
            for raw in raw_items:
                if len(products) >= limit:
                    break
                pid = str(raw.get("productId") or "").strip()
                title = str(raw.get("productName") or "").strip()
                brand = normalize_brand(raw.get("brand"))
                if not pid or not title or pid in seen_ids:
                    continue
                if not matches_core_tokens(title, brand, core_tokens):
                    continue

                offer = extract_vtex_offer(raw)
                if not offer:
                    continue

                seen_ids.add(pid)
                link = raw.get("link") or f"{self.base_url}/{raw.get('linkText', '')}/p"
                pack_size = extract_pack_size(title) or extract_pack_size(offer["unit"] or "")
                unit_price, unit_base = compute_unit_price(offer["price"], pack_size or title)
                products.append({
                    "id": f"{self.source_key.upper()}-{pid}",
                    "source": self.source_name,
                    "sourceKey": self.source_key,
                    "title": title,
                    "brand": brand,
                    "price": offer["price"],
                    "listPrice": offer["listPrice"],
                    "discountPct": offer["discountPct"],
                    "unit": offer["unit"],
                    "packSize": pack_size,
                    "unitPrice": unit_price,
                    "unitBase": unit_base,
                    "currency": self.currency,
                    "rating": None,
                    "reviews": None,
                    "freeShipping": False,
                    "seller": self.source_name,
                    "url": link,
                })
                added += 1

            if len(raw_items) < self.page_size or added == 0:
                break
            offset += self.page_size

        resp = self.build_response(term=term, products=products, pages_read=pages_read)
        if requested_size:
            resp["requestedSize"] = requested_size
        return resp


class DiaARScraper(VtexSupermarketScraper):
    source_key = "dia_ar"
    source_name = "Supermercados DIA%"
    base_url = "https://diaonline.supermercadosdia.com.ar"


class CarrefourARScraper(VtexSupermarketScraper):
    source_key = "carrefour_ar"
    source_name = "Carrefour AR"
    base_url = "https://www.carrefour.com.ar"


class MasOnlineARScraper(VtexSupermarketScraper):
    source_key = "masonline_ar"
    source_name = "Más Online (ChangoMás)"
    base_url = "https://www.masonline.com.ar"


class AllSupermarketsScraper(MarketplaceScraper):
    """Consulta en paralelo SEPA, DIA%, Carrefour y Más Online para comparar precios de góndola."""

    source_key = "todos_supermercados"
    source_name = "Todos los Supermercados"
    currency = "ARS"
    region = "AR"
    base_url = "https://diaonline.supermercadosdia.com.ar"

    def __init__(self, timeout: int = 15):
        self.timeout = timeout

    def search(self, term: str, limit: int = 150) -> Dict[str, Any]:
        limit = max(15, min(int(limit), 200))
        _, _, requested_size = parse_query_intent(term)
        scrapers = [
            PreciosClarosTrenqueLauquenScraper(timeout=self.timeout),
            DiaARScraper(timeout=self.timeout),
            CarrefourARScraper(timeout=self.timeout),
            MasOnlineARScraper(timeout=self.timeout),
        ]
        per_store_limit = max(15, limit // len(scrapers))
        all_products: List[Dict[str, Any]] = []
        total_pages = 0

        with ThreadPoolExecutor(max_workers=len(scrapers)) as pool:
            futures = [pool.submit(sc.search, term, per_store_limit) for sc in scrapers]
            for fut in as_completed(futures):
                try:
                    res = fut.result()
                    all_products.extend(res.get("products") or [])
                    total_pages += res.get("pagesRead", 0)
                except Exception:
                    continue

        all_products.sort(key=lambda item: item.get("price", float("inf")))
        resp = self.build_response(term=term, products=all_products[:limit], pages_read=total_pages)
        if requested_size:
            resp["requestedSize"] = requested_size
        return resp
