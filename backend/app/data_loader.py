from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .schemas import Product

# 提案対象はコンビニの食品・飲料のみ（サプリ等は除外）
ALLOWED_CATEGORIES = frozenset({"food", "beverage"})

DATA_DIR = Path(__file__).parent / "data"
PRODUCTS_PATH = DATA_DIR / "products.json"


@dataclass(frozen=True)
class NutrientStats:
    # min/max used for x_norm = (x - min) / (max - min)
    protein_g: tuple[float, float]
    fat_g: tuple[float, float]
    vitamin_mg: tuple[float, float]
    sugar_g: tuple[float, float]
    calories_kcal: tuple[float, float]


def _calc_stats(products: list[Product]) -> NutrientStats:
    def mm(getter):
        vals = [getter(p) for p in products]
        mn = float(min(vals)) if vals else 0.0
        mx = float(max(vals)) if vals else 1.0
        if mx <= mn:
            mx = mn + 1.0  # avoid division by zero
        return (mn, mx)

    return NutrientStats(
        protein_g=mm(lambda p: p.nutrients.protein_g),
        fat_g=mm(lambda p: p.nutrients.fat_g),
        vitamin_mg=mm(lambda p: p.nutrients.vitamin_mg),
        sugar_g=mm(lambda p: p.nutrients.sugar_g),
        calories_kcal=mm(lambda p: p.nutrients.calories_kcal),
    )


_cache: dict[str, Any] = {}


def load_products() -> list[Product]:
    if "products" in _cache:
        return _cache["products"]
    raw = json.loads(PRODUCTS_PATH.read_text(encoding="utf-8"))
    products = [Product.model_validate(item) for item in raw]
    products = [p for p in products if p.category in ALLOWED_CATEGORIES]
    _cache["products"] = products
    _cache["stats"] = _calc_stats(products)
    return products


def get_nutrient_stats() -> NutrientStats:
    if "stats" not in _cache:
        load_products()
    return _cache["stats"]

