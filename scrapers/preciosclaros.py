#!/usr/bin/env python3
"""Extractor oficial de Precios Claros (SEPA) geolocalizado en Trenque Lauquen, agrupado por cadena."""

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import requests

from base import MarketplaceScraper
from relevance import compute_unit_price, extract_pack_size, matches_core_tokens, normalize_brand, parse_query_intent

BASE_API = "https://d3e6htiiul5ek9.cloudfront.net/prod"
TRENQUE_LAUQUEN_LAT = -35.9703
TRENQUE_LAUQUEN_LNG = -62.7306

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


class PreciosClarosTrenqueLauquenScraper(MarketplaceScraper):
    """
    Consulta la API pública de Precios Claros (SEPA) para las sucursales
    cercanas a Trenque Lauquen, separando por cadena para identificar exactamente
    en qué supermercado y dirección está cada precio.
    """

    source_key = "precios_claros_tl"
    source_name = "Precios Claros · Trenque Lauquen"
    currency = "ARS"
    region = "AR"
    base_url = "https://www.preciosclaros.gob.ar"

    def __init__(
        self,
        lat: float = TRENQUE_LAUQUEN_LAT,
        lng: float = TRENQUE_LAUQUEN_LNG,
        timeout: int = 15,
    ):
        self.lat = lat
        self.lng = lng
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
            "Accept-Language": "es-AR,es;q=0.9",
        })

    def _fetch_branches(self, limit: int = 30) -> List[Dict[str, Any]]:
        query = urlencode({"lat": self.lat, "lng": self.lng, "limit": limit})
        resp = self.session.get(f"{BASE_API}/sucursales?{query}", timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()
        return data.get("sucursales") or []

    def _fetch_products_page(
        self, term: str, branch_ids: List[str], offset: int, page_limit: int
    ) -> Dict[str, Any]:
        query = urlencode({
            "string": term.strip(),
            "array_sucursales": ",".join(branch_ids),
            "offset": offset,
            "limit": page_limit,
        })
        resp = self.session.get(f"{BASE_API}/productos?{query}", timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    def _group_branches_by_chain(self, branches: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        for branch in branches:
            bid = str(branch.get("id") or "").strip()
            chain = str(branch.get("banderaDescripcion") or "Comercio SEPA").strip()
            if not bid:
                continue
            grouped.setdefault(chain, []).append(branch)
        return grouped

    def _fetch_chain_products(
        self,
        chain_name: str,
        chain_branches: List[Dict[str, Any]],
        core_query: str,
        core_tokens: List[str],
        max_items: int,
    ) -> List[Dict[str, Any]]:
        branch_ids = [str(b["id"]) for b in chain_branches[:5]]
        nearest = chain_branches[0]
        address = str(nearest.get("direccion") or "").strip()
        locality = str(nearest.get("localidad") or "").strip()
        branch_label = f"{chain_name} ({address})" if address else chain_name

        payload = self._fetch_products_page(core_query, branch_ids, 0, min(50, max_items * 2))
        raw_items = payload.get("productos") or []
        products: List[Dict[str, Any]] = []
        seen_ids = set()

        for raw in raw_items:
            if len(products) >= max_items:
                break
            pid = str(raw.get("id") or "").strip()
            name = str(raw.get("nombre") or "").strip()
            brand = normalize_brand(raw.get("marca"))
            if not pid or not name or pid in seen_ids:
                continue
            if not matches_core_tokens(name, brand, core_tokens):
                continue

            price_min = raw.get("precioMin")
            price_max = raw.get("precioMax")
            price = price_min if isinstance(price_min, (int, float)) and price_min > 0 else raw.get("precio")
            if not isinstance(price, (int, float)) or price < 50:
                continue

            seen_ids.add(pid)
            presentation = str(raw.get("presentacion") or "").strip()
            list_price: Optional[float] = (
                float(price_max)
                if isinstance(price_max, (int, float)) and price_max > price
                else None
            )
            spread_pct = (
                round((1 - float(price) / list_price) * 100)
                if list_price and list_price > price
                else 0
            )
            title = (
                f"{name} ({presentation})"
                if presentation and presentation.lower() not in name.lower()
                else name
            )
            pack_size = extract_pack_size(presentation) or extract_pack_size(name)
            unit_price, unit_base = compute_unit_price(price, pack_size or name)
            chain_slug = chain_name.upper().replace(" ", "_")[:14]

            products.append({
                "id": f"SEPA-{chain_slug}-{pid}",
                "source": f"SEPA · {chain_name}",
                "sourceKey": self.source_key,
                "title": title,
                "brand": brand,
                "price": float(price),
                "listPrice": list_price,
                "discountPct": spread_pct,
                "unit": presentation or None,
                "packSize": pack_size,
                "unitPrice": unit_price,
                "unitBase": unit_base,
                "currency": self.currency,
                "rating": None,
                "reviews": None,
                "freeShipping": False,
                "seller": f"{branch_label}{', ' + locality if locality else ''}",
                "url": f"{self.base_url}/#!/buscar-productos",
            })

        return products

    def search(self, term: str, limit: int = 100) -> Dict[str, Any]:
        limit = max(10, min(int(limit), 200))
        core_query, core_tokens, requested_size = parse_query_intent(term)
        branches = self._fetch_branches(limit=30)
        grouped = self._group_branches_by_chain(branches)
        if not grouped:
            return self.build_response(term=term, products=[], pages_read=0)

        per_chain_limit = max(12, limit // max(1, len(grouped)))
        products: List[Dict[str, Any]] = []
        pages_read = 0

        with ThreadPoolExecutor(max_workers=min(4, len(grouped))) as pool:
            futures = [
                pool.submit(self._fetch_chain_products, chain, b_list, core_query, core_tokens, per_chain_limit)
                for chain, b_list in grouped.items()
            ]
            for fut in as_completed(futures):
                try:
                    batch = fut.result()
                    if batch:
                        products.extend(batch)
                        pages_read += 1
                except Exception:
                    continue

        products.sort(key=lambda item: item.get("price", float("inf")))
        resp = self.build_response(term=term, products=products[:limit], pages_read=pages_read)
        if requested_size:
            resp["requestedSize"] = requested_size
        return resp
