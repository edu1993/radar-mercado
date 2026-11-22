#!/usr/bin/env python3
"""Punto de entrada unificado para ejecutar búsquedas simples o listas de changuito en supermercados."""

import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List

from preciosclaros import PreciosClarosTrenqueLauquenScraper
from vtex import (
    AllSupermarketsScraper,
    CarrefourARScraper,
    DiaARScraper,
    MasOnlineARScraper,
)

REGISTRY = {
    "precios_claros_tl": PreciosClarosTrenqueLauquenScraper,
    "dia_ar": DiaARScraper,
    "carrefour_ar": CarrefourARScraper,
    "masonline_ar": MasOnlineARScraper,
    "todos_supermercados": AllSupermarketsScraper,
}

MAX_BASKET_ITEMS = 6


def list_registered_sources():
    return [cls.metadata() for cls in REGISTRY.values()]


def parse_search_items(raw_term: str) -> List[str]:
    """Separa búsquedas por coma o punto y coma para habilitar el modo Changuito multi-producto."""
    parts = [p.strip() for p in raw_term.replace(";", ",").split(",")]
    items: List[str] = []
    seen = set()
    for part in parts:
        if len(part) < 2:
            continue
        key = part.lower()
        if key in seen:
            continue
        seen.add(key)
        items.append(part)
        if len(items) >= MAX_BASKET_ITEMS:
            break
    return items


def run_search(source_key: str, term: str, limit: int = 100) -> Dict[str, Any]:
    items = parse_search_items(term)
    if not items:
        raise ValueError("Indicá al menos un producto válido de 2 caracteres o más.")

    scraper_cls = REGISTRY[source_key]

    if len(items) == 1:
        result = scraper_cls().search(items[0], limit=limit)
        for prod in result.get("products") or []:
            prod["searchItem"] = items[0]
        result["isBasket"] = False
        result["searchItems"] = items
        return result

    per_item_limit = max(12, min(60, limit // len(items)))
    combined_products: List[Dict[str, Any]] = []
    total_pages = 0
    first_meta = scraper_cls.metadata()

    def fetch_one(item_term: str):
        res = scraper_cls().search(item_term, limit=per_item_limit)
        prods = res.get("products") or []
        for idx, prod in enumerate(prods):
            prod["searchItem"] = item_term
            # Garantiza unicidad de ID incluso si un mismo SKU aparece en dos ítems de la lista
            prod["id"] = f"{prod.get('id', idx)}::{item_term.lower().replace(' ', '_')[:12]}"
        return prods, res.get("pagesRead", 0)

    with ThreadPoolExecutor(max_workers=min(4, len(items))) as pool:
        futures = [pool.submit(fetch_one, item_term) for item_term in items]
        for fut in as_completed(futures):
            try:
                prods, pages = fut.result()
                combined_products.extend(prods)
                total_pages += pages
            except Exception:
                continue

    combined_products.sort(key=lambda p: (p.get("searchItem", ""), p.get("price", float("inf"))))
    sample = scraper_cls()
    response = sample.build_response(term=", ".join(items), products=combined_products, pages_read=total_pages)
    response["source"] = first_meta["sourceName"]
    response["isBasket"] = True
    response["searchItems"] = items
    return response


def main():
    parser = argparse.ArgumentParser(description="Radar Mercado — Extractor de Supermercados (Trenque Lauquen)")
    parser.add_argument("--list-sources", action="store_true", help="Lista los supermercados registrados en JSON")
    parser.add_argument("--source", default="todos_supermercados", choices=list(REGISTRY.keys()))
    parser.add_argument("--term", required=False)
    parser.add_argument("--limit", type=int, default=100)
    args = parser.parse_args()

    if args.list_sources:
        print(json.dumps(list_registered_sources(), ensure_ascii=False))
        return

    if not args.term or not args.term.strip():
        parser.error("El parámetro --term es obligatorio salvo que se use --list-sources.")

    result = run_search(args.source, args.term, limit=args.limit)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Error en extractor: {exc}", file=sys.stderr)
        sys.exit(1)
