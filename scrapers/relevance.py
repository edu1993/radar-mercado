"""Filtrado estricto de relevancia, normalización de envases y cálculo de precio por kg/litro."""

import re
import unicodedata
from typing import Dict, List, Optional, Tuple

STOPWORDS = {
    "de", "del", "la", "las", "el", "los", "un", "una", "con", "sin", "para", "por", "en", "al", "y", "o",
    "litro", "litros", "lt", "lts", "l", "ml", "cc", "cm3", "gr", "grs", "g", "grm", "kg", "kgs", "kgm",
    "kilo", "kilos", "paq", "paquete", "botella", "lata", "pack", "unidad", "unidades", "un", "u", "x",
}

SIZE_REGEX = re.compile(
    r"(?<!\d)(\d+(?:[.,]\d+)?)\s*(litros?|lts?|l|ml|cc|cm3|kgm?|kgs?|kilos?|grs?|grm?|g)\b",
    re.IGNORECASE,
)

# Reglas para evitar falsos positivos típicos de supermercado (ej. "atún en aceite" al buscar "aceite")
NEGATIVE_CONTEXT_BY_TOKEN: Dict[str, Tuple[str, ...]] = {
    "aceite": (
        "en aceite", "atun", "merluza", "sardina", "caballa", "lomito", "filet",
        "corporal", "bronceador", "capilar", "motor", "esencial", "masaje", "bebe", "aromatizante", "difusor", "hornillo", "organic spa", "fragancia", "perfume",
    ),
    "arroz": (
        "condimento para arroz", "sazonador", "galleta", "galletita", "tostada",
        "alfajor", "snack", "postre", "arroz con leche", "bebida de arroz", "vinagre de arroz", "copos", "inflado", "cereales de arroz", "cereal de arroz", "menu asociados", "barrita",
    ),
    "leche": (
        "dulce de leche", "arroz con leche", "crema corporal", "leche corporal",
        "leche de limpieza", "desmaquillante", "shampoo", "acondicionador", "jabon",
    ),
    "yerba": ("mate cocido", "bombilla", "termo", "yerbera", "mate de"),
    "fernet": ("vaso", "hielo", "copa", "estuche"),
    "coca": ("alfajor", "galletita", "caramelo", "chupetin"),
    "azucar": (
        "chicle", "sin azucar", "gaseosa", "galletita", "galleta", "caramelo",
        "golosina", "chupetin", "edulcorante", "gomita", "alfajor", "cereal", "postre",
    ),
}


def normalize_text(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", str(text or ""))
    no_accents = "".join(ch for ch in nfkd if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", no_accents).strip().lower()


BRAND_ALIASES = {
    "coke/cocacola": "Coca-Cola",
    "coca cola": "Coca-Cola",
    "coca-cola": "Coca-Cola",
    "cocacola": "Coca-Cola",
    "buhero": "Buhero Negro",
    "búhero": "Buhero Negro",
    "buhero negro": "Buhero Negro",
    "búhero negro": "Buhero Negro",
    "fernet branca": "Branca",
    "branca": "Branca",
    "dia%": "DIA",
    "dia": "DIA",
}
IGNORED_BRANDS = {"generico", "genérico", "sin marca", "varios", "s/m", "n/a", "none"}


def normalize_brand(brand: Optional[str]) -> Optional[str]:
    if not brand:
        return None
    clean = re.sub(r"\s+", " ", str(brand)).strip()
    low = clean.lower()
    if not clean or low in IGNORED_BRANDS:
        return None
    if low in BRAND_ALIASES:
        return BRAND_ALIASES[low]
    if clean.upper() in ("DIA", "CBSE", "CBSÉ", "1882"):
        return clean.upper()
    return " ".join(word.capitalize() for word in low.split(" "))


def _preprocess_spoken_units(text: str) -> str:
    out = str(text or "")
    out = re.sub(r"\bun\s+litro\b", "1 litro", out, flags=re.IGNORECASE)
    out = re.sub(r"\bun\s+kilo\b", "1 kilo", out, flags=re.IGNORECASE)
    out = re.sub(r"\bmedio\s+litro\b", "500 ml", out, flags=re.IGNORECASE)
    out = re.sub(r"\bmedio\s+kilo\b", "500 g", out, flags=re.IGNORECASE)
    return out


def parse_pack_size_info(text: str) -> Optional[Tuple[str, float, str]]:
    """
    Devuelve (etiqueta_normalizada, cantidad_en_unidad_base, unidad_base)
    donde unidad_base es 'L' o 'kg'. Ej: ('750 ml', 0.75, 'L'), ('500 g', 0.5, 'kg').
    """
    if not text:
        return None
    prepared = _preprocess_spoken_units(text)
    match = SIZE_REGEX.search(prepared)
    if not match:
        return None

    raw_num = match.group(1).replace(",", ".")
    unit = match.group(2).lower()
    try:
        val = float(raw_num)
    except ValueError:
        return None
    if val <= 0:
        return None

    if unit in ("l", "lt", "lts", "litro", "litros"):
        base_qty = val
        label = (
            f"{int(round(val * 1000))} ml"
            if val < 1
            else f"{int(val) if val.is_integer() else round(val, 2)} L"
        )
        return label, base_qty, "L"

    if unit in ("ml", "cc", "cm3"):
        base_qty = val / 1000.0
        if val >= 1000 and val % 250 == 0:
            liters = val / 1000.0
            label = f"{int(liters) if liters.is_integer() else round(liters, 2)} L"
        else:
            label = f"{int(round(val))} ml"
        return label, base_qty, "L"

    if unit in ("kg", "kgs", "kgm", "kilo", "kilos"):
        base_qty = val
        label = (
            f"{int(round(val * 1000))} g"
            if val < 1
            else f"{int(val) if val.is_integer() else round(val, 2)} kg"
        )
        return label, base_qty, "kg"

    if unit in ("g", "gr", "grs", "grm"):
        base_qty = val / 1000.0
        if val >= 1000 and val % 250 == 0:
            kg = val / 1000.0
            label = f"{int(kg) if kg.is_integer() else round(kg, 2)} kg"
        else:
            label = f"{int(round(val))} g"
        return label, base_qty, "kg"

    return None


def extract_pack_size(text: str) -> Optional[str]:
    info = parse_pack_size_info(text)
    return info[0] if info else None


def compute_unit_price(price: Optional[float], text: str) -> Tuple[Optional[float], Optional[str]]:
    """Calcula el precio por litro ($/L) o por kilo ($/kg) a partir del precio y envase."""
    if not isinstance(price, (int, float)) or price <= 0:
        return None, None
    info = parse_pack_size_info(text)
    if not info:
        return None, None
    _, base_qty, base_unit = info
    if base_qty <= 0:
        return None, None
    return round(float(price) / base_qty, 2), base_unit


def parse_query_intent(raw_term: str) -> Tuple[str, List[str], Optional[str]]:
    prepared = _preprocess_spoken_units(raw_term)
    requested_size = extract_pack_size(prepared)
    cleaned = SIZE_REGEX.sub(" ", prepared)
    norm = normalize_text(cleaned)
    raw_tokens = re.findall(r"[a-z0-9]+", norm)

    core_tokens: List[str] = []
    for tok in raw_tokens:
        if tok in STOPWORDS or tok.isdigit() or len(tok) < 2:
            continue
        if tok not in core_tokens:
            core_tokens.append(tok)

    if not core_tokens:
        core_tokens = [t for t in re.findall(r"[a-z0-9]+", normalize_text(raw_term)) if len(t) >= 2]

    core_query = " ".join(core_tokens) if core_tokens else raw_term.strip()
    return core_query, core_tokens, requested_size


def matches_core_tokens(title: str, brand: Optional[str], core_tokens: List[str]) -> bool:
    """Valida palabras clave obligatorias y descarta falsos positivos de góndola."""
    if not core_tokens:
        return True
    haystack = normalize_text(f"{title or ''} {brand or ''}")
    if not all(tok in haystack for tok in core_tokens):
        return False

    query_joined = " ".join(core_tokens)
    for tok in core_tokens:
        blocked_phrases = NEGATIVE_CONTEXT_BY_TOKEN.get(tok, ())
        for phrase in blocked_phrases:
            if phrase in haystack and phrase not in query_joined:
                return False

    return True
