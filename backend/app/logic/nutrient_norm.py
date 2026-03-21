from __future__ import annotations

from ..data_loader import get_nutrient_stats
from ..schemas import Nutrients


def _clamp01(x: float) -> float:
    if x < 0.0:
        return 0.0
    if x > 1.0:
        return 1.0
    return x


def normalize_nutrients(n: Nutrients) -> dict[str, float]:
    stats = get_nutrient_stats()

    def norm(val: float, mn: float, mx: float) -> float:
        return _clamp01((val - mn) / (mx - mn))

    return {
        "protein_g": norm(n.protein_g, stats.protein_g[0], stats.protein_g[1]),
        "fat_g": norm(n.fat_g, stats.fat_g[0], stats.fat_g[1]),
        "vitamin_mg": norm(n.vitamin_mg, stats.vitamin_mg[0], stats.vitamin_mg[1]),
        "sugar_g": norm(n.sugar_g, stats.sugar_g[0], stats.sugar_g[1]),
        "calories_kcal": norm(n.calories_kcal, stats.calories_kcal[0], stats.calories_kcal[1]),
    }
