import sys
import unittest
from pathlib import Path
from unittest.mock import patch

SCRAPERS_DIR = Path(__file__).resolve().parent.parent
if str(SCRAPERS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRAPERS_DIR))

from preciosclaros import PreciosClarosTrenqueLauquenScraper
from registry import REGISTRY, list_registered_sources, parse_search_items, run_search
from relevance import compute_unit_price, extract_pack_size, matches_core_tokens, normalize_brand, parse_query_intent
from vtex import (
    AllSupermarketsScraper,
    CarrefourARScraper,
    DiaARScraper,
    MasOnlineARScraper,
    extract_vtex_offer,
)


class TestVtexSupermarkets(unittest.TestCase):
    def test_extract_vtex_offer_calculates_discount_and_ignores_out_of_stock(self):
        raw_item = {
            "productId": "5012",
            "productName": "Yerba Mate Playadito Suave 500g",
            "brand": "Playadito",
            "link": "https://diaonline.supermercadosdia.com.ar/yerba-playadito-500g/p",
            "items": [
                {
                    "measurementUnit": "g",
                    "unitMultiplier": 500,
                    "sellers": [
                        {
                            "sellerName": "Sin Stock",
                            "commertialOffer": {"Price": 0, "AvailableQuantity": 0},
                        },
                        {
                            "sellerName": "DIA",
                            "commertialOffer": {
                                "Price": 2400,
                                "ListPrice": 3000,
                                "AvailableQuantity": 15,
                            },
                        },
                    ],
                }
            ],
        }
        offer = extract_vtex_offer(raw_item)
        self.assertIsNotNone(offer)
        self.assertEqual(offer["price"], 2400.0)
        self.assertEqual(offer["listPrice"], 3000.0)
        self.assertEqual(offer["discountPct"], 20)
        self.assertEqual(offer["unit"], "500 g")

    def test_dia_carrefour_and_masonline_return_standard_schema(self):
        sample_payload = [
            {
                "productId": "9001",
                "productName": "Leche Entera La Serenísima 1L",
                "brand": "La Serenísima",
                "link": "https://diaonline.supermercadosdia.com.ar/leche-1l/p",
                "items": [
                    {
                        "sellers": [
                            {
                                "sellerName": "Super",
                                "commertialOffer": {"Price": 1650, "ListPrice": 1800, "AvailableQuantity": 20},
                            }
                        ]
                    }
                ],
            }
        ]
        for cls, expected_key in [
            (DiaARScraper, "dia_ar"),
            (CarrefourARScraper, "carrefour_ar"),
            (MasOnlineARScraper, "masonline_ar"),
        ]:
            scraper = cls()
            with patch.object(scraper, "_fetch_page", side_effect=[sample_payload, []]):
                result = scraper.search("leche", limit=20)
            self.assertEqual(result["sourceKey"], expected_key)
            self.assertEqual(result["totalProducts"], 1)
            self.assertEqual(result["products"][0]["price"], 1650.0)
            self.assertEqual(result["products"][0]["brand"], "La Serenísima")

    def test_all_supermarkets_merges_and_sorts_by_lowest_price(self):
        mock_dia = {"products": [{"id": "DIA-1", "price": 2600, "source": "Supermercados DIA%"}], "pagesRead": 1}
        mock_crf = {"products": [{"id": "CRF-1", "price": 2300, "source": "Carrefour AR"}], "pagesRead": 1}
        mock_mas = {"products": [{"id": "MAS-1", "price": 2900, "source": "Más Online (ChangoMás)"}], "pagesRead": 1}

        mock_sepa = {"products": [{"id": "SEPA-1", "price": 2150, "source": "Precios Claros · Trenque Lauquen"}], "pagesRead": 1}
        with patch.object(PreciosClarosTrenqueLauquenScraper, "search", return_value=mock_sepa), \
             patch.object(DiaARScraper, "search", return_value=mock_dia), \
             patch.object(CarrefourARScraper, "search", return_value=mock_crf), \
             patch.object(MasOnlineARScraper, "search", return_value=mock_mas):
            result = AllSupermarketsScraper().search("yerba", limit=30)

        self.assertEqual(result["sourceKey"], "todos_supermercados")
        self.assertEqual(result["totalProducts"], 4)
        self.assertEqual([p["price"] for p in result["products"]], [2150, 2300, 2600, 2900])

    def test_precios_claros_trenque_lauquen_extracts_sepa_products(self):
        scraper = PreciosClarosTrenqueLauquenScraper()
        mock_branches = [{"id": "15-1-1525", "banderaDescripcion": "Supermercados DIA"}]
        mock_products = {
            "total": 1,
            "productos": [
                {
                    "id": "7790387014129",
                    "nombre": "Yerba Mate Playadito Suave",
                    "marca": "PLAYADITO",
                    "presentacion": "500 gr",
                    "precioMin": 2400,
                    "precioMax": 3000,
                    "cantSucursalesDisponible": 4,
                }
            ],
        }
        with patch.object(scraper, "_fetch_branches", return_value=mock_branches), \
             patch.object(scraper, "_fetch_products_page", return_value=mock_products):
            result = scraper.search("yerba", limit=20)

        self.assertEqual(result["sourceKey"], "precios_claros_tl")
        self.assertEqual(result["totalProducts"], 1)
        self.assertTrue(result["products"][0]["id"].startswith("SEPA-"))
        self.assertEqual(result["products"][0]["discountPct"], 20)


class TestRegistry(unittest.TestCase):
    def test_registry_exposes_only_supermarket_sources(self):
        self.assertEqual(
            set(REGISTRY.keys()),
            {"precios_claros_tl", "dia_ar", "carrefour_ar", "masonline_ar", "todos_supermercados"},
        )
        self.assertEqual(len(list_registered_sources()), 5)


    def test_parse_search_items_and_basket_mode(self):
        self.assertEqual(parse_search_items("yerba mate, coca cola, yerba mate"), ["yerba mate", "coca cola"])
        mock_dia_a = {"products": [{"id": "DIA-1", "price": 2000, "source": "Supermercados DIA%"}], "pagesRead": 1}
        mock_dia_b = {"products": [{"id": "DIA-2", "price": 3000, "source": "Supermercados DIA%"}], "pagesRead": 1}
        with patch.object(DiaARScraper, "search", side_effect=[mock_dia_a, mock_dia_b]):
            res = run_search("dia_ar", "yerba mate, coca cola", limit=40)
        self.assertTrue(res["isBasket"])
        self.assertEqual(res["searchItems"], ["yerba mate", "coca cola"])
        self.assertEqual(res["totalProducts"], 2)


    def test_relevance_rejects_lavandina_when_searching_fernet_1_litro(self):
        core_q, core_tokens, req_size = parse_query_intent("fernet 1 litro")
        self.assertEqual(core_q, "fernet")
        self.assertEqual(core_tokens, ["fernet"])
        self.assertEqual(req_size, "1 L")
        self.assertFalse(matches_core_tokens("Lavandina Ayudín 1 Litro", "Ayudín", core_tokens))
        self.assertTrue(matches_core_tokens("Fernet Branca 750 ml", "Branca", core_tokens))
        self.assertEqual(extract_pack_size("Coca Cola Sabor Original 2.25 Lts"), "2.25 L")
        self.assertEqual(extract_pack_size("Fernet Branca 750 cc"), "750 ml")
        self.assertEqual(extract_pack_size("Yerba Mate Playadito 500 gr"), "500 g")


    def test_unit_price_spoken_units_brand_normalization_and_false_positives(self):
        _, _, req_spoken = parse_query_intent("fernet de un litro")
        self.assertEqual(req_spoken, "1 L")
        self.assertFalse(matches_core_tokens("Lomito de atún en aceite Carrefour 170 grs", "Carrefour", ["aceite"]))
        self.assertFalse(matches_core_tokens("Condimento para arroz 50 g", "Alicante", ["arroz"]))
        self.assertTrue(matches_core_tokens("Aceite de girasol Natura 900 ml", "Natura", ["aceite"]))
        up, ub = compute_unit_price(892.0, "450 ml")
        self.assertEqual(ub, "L")
        self.assertAlmostEqual(up, 1982.22, places=1)
        self.assertEqual(normalize_brand("BRANCA"), "Branca")
        self.assertEqual(normalize_brand("Branca"), "Branca")
        self.assertFalse(matches_core_tokens("Chicle Beldent con azúcar 10 g", "Beldent", ["azucar"]))
        self.assertTrue(matches_core_tokens("Azúcar Ledesma Clásica 1 kg", "Ledesma", ["azucar"]))


if __name__ == "__main__":
    unittest.main()
