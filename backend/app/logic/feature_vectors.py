"""
献立スコア用の明示的特徴ベクトル（ローカル計算）。
AWS では Titan Embeddings や OpenSearch k-NN に置き換え可能な「同じ次元の意味空間」を想定。
"""

from __future__ import annotations

import math

from ..schemas import Nutrients
from .goals import NUTRIENT_KEYS, get_goal_config
from .nutrient_norm import normalize_nutrients


def goal_center_vector(goal: str) -> dict[str, float]:
    """ゴールごとの理想帯の中央（正規化 0..1 空間）。"""
    cfg = get_goal_config(goal)
    return {k: (cfg.nutrients[k].ideal_min + cfg.nutrients[k].ideal_max) / 2.0 for k in NUTRIENT_KEYS}


def meal_normalized_vector(totals: Nutrients) -> dict[str, float]:
    """3品合算の栄養を商品プールと同じ正規化でベクトル化。"""
    return normalize_nutrients(totals)


def cosine_similarity_dict(a: dict[str, float], b: dict[str, float]) -> float:
    dot = sum(a[k] * b[k] for k in NUTRIENT_KEYS)
    na = math.sqrt(sum(a[k] * a[k] for k in NUTRIENT_KEYS))
    nb = math.sqrt(sum(b[k] * b[k] for k in NUTRIENT_KEYS))
    if na < 1e-12 or nb < 1e-12:
        return 0.0
    return dot / (na * nb)
