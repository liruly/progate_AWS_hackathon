from __future__ import annotations

from dataclasses import dataclass


NUTRIENT_KEYS = ["protein_g", "fat_g", "vitamin_mg", "sugar_g", "calories_kcal"]


@dataclass(frozen=True)
class NutrientIdeal:
    # x_norm is expected to be in [0, 1] (clamped)
    ideal_min: float
    ideal_max: float
    weight: float


@dataclass(frozen=True)
class GoalConfig:
    name: str
    nutrients: dict[str, NutrientIdeal]


def _make_ideal(protein, fat, vitamin, sugar, calories, *, weights=None) -> dict[str, NutrientIdeal]:
    weights = weights or {}
    return {
        "protein_g": NutrientIdeal(protein[0], protein[1], weights.get("protein_g", 1.2)),
        "fat_g": NutrientIdeal(fat[0], fat[1], weights.get("fat_g", 0.9)),
        "vitamin_mg": NutrientIdeal(vitamin[0], vitamin[1], weights.get("vitamin_mg", 1.1)),
        "sugar_g": NutrientIdeal(sugar[0], sugar[1], weights.get("sugar_g", 1.0)),
        "calories_kcal": NutrientIdeal(calories[0], calories[1], weights.get("calories_kcal", 0.8)),
    }


GOALS: dict[str, GoalConfig] = {
    # diet: protein/vitamin higher, fat/sugar/calories lower
    "diet": GoalConfig(
        name="diet",
        nutrients=_make_ideal(
            protein=(0.55, 1.0),
            fat=(0.0, 0.45),
            vitamin=(0.45, 1.0),
            sugar=(0.0, 0.45),
            calories=(0.0, 0.50),
            weights={"protein_g": 1.4, "vitamin_mg": 1.3, "sugar_g": 1.2, "calories_kcal": 1.0},
        ),
    ),
    # muscle_bulk: protein/calories higher, fat moderate, sugar not too high
    "muscle_bulk": GoalConfig(
        name="muscle_bulk",
        nutrients=_make_ideal(
            protein=(0.45, 1.0),
            fat=(0.20, 0.75),
            vitamin=(0.35, 1.0),
            sugar=(0.0, 0.65),
            calories=(0.35, 1.0),
            weights={"protein_g": 1.4, "calories_kcal": 1.2, "vitamin_mg": 1.0, "sugar_g": 0.9},
        ),
    ),
    # balanced: keep most nutrients in middle bands
    "balanced": GoalConfig(
        name="balanced",
        nutrients=_make_ideal(
            protein=(0.25, 0.85),
            fat=(0.15, 0.8),
            vitamin=(0.2, 0.85),
            sugar=(0.0, 0.7),
            calories=(0.15, 0.75),
            weights={"protein_g": 1.0, "vitamin_mg": 1.0, "sugar_g": 1.0, "calories_kcal": 0.9},
        ),
    ),
}


def get_goal_config(goal: str) -> GoalConfig:
    return GOALS.get(goal, GOALS["balanced"])

