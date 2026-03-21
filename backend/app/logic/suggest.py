from __future__ import annotations

import math
import random
from collections import defaultdict
from dataclasses import dataclass
from typing import Iterable, Optional

from ..data_loader import get_nutrient_stats
from ..schemas import Nutrients, Product, ProductExplanation
from .feature_vectors import cosine_similarity_dict, goal_center_vector, meal_normalized_vector
from .goals import NUTRIENT_KEYS, get_goal_config
from .nutrient_norm import normalize_nutrients


@dataclass(frozen=True)
class DeficitResult:
    total_deficit: float
    per_nutrient: dict[str, float]  # nutrient -> deficit distance (0..)


def compute_deficit(goal: str, totals: Nutrients) -> DeficitResult:
    cfg = get_goal_config(goal)
    x = normalize_nutrients(totals)

    per: dict[str, float] = {}
    total = 0.0
    for key in NUTRIENT_KEYS:
        ideal = cfg.nutrients[key]
        xi = x[key]
        # distance outside [ideal_min, ideal_max]
        if xi < ideal.ideal_min:
            d = (ideal.ideal_min - xi) / max(ideal.ideal_min, 1e-6)
        elif xi > ideal.ideal_max:
            denom = max(1.0 - ideal.ideal_max, 1e-6)
            d = (xi - ideal.ideal_max) / denom
        else:
            d = 0.0
        per[key] = float(d)
        total += d * ideal.weight

    return DeficitResult(total_deficit=total, per_nutrient=per)


def _nutrients_sum(a: Nutrients, b: Nutrients) -> Nutrients:
    return Nutrients(
        protein_g=a.protein_g + b.protein_g,
        fat_g=a.fat_g + b.fat_g,
        vitamin_mg=a.vitamin_mg + b.vitamin_mg,
        sugar_g=a.sugar_g + b.sugar_g,
        calories_kcal=a.calories_kcal + b.calories_kcal,
    )


def _meal_to_explanations(goal: str, items: list[Product], totals: Nutrients) -> list[ProductExplanation]:
    # For each item, mention the nutrient where that item contributes most
    # to the overall deficit reduction.
    deficit = compute_deficit(goal, totals)
    # most needed nutrients: highest deficit
    needed = sorted(deficit.per_nutrient.items(), key=lambda x: x[1], reverse=True)[:2]
    needed_keys = [k for k, _ in needed]

    explanations: list[ProductExplanation] = []
    for p in items:
        # contributions to needed nutrients
        contribs = {k: getattr(p.nutrients, k) for k in needed_keys}
        best_key = max(contribs.keys(), key=lambda k: contribs[k])
        val = contribs[best_key]

        mood_hit = "気分タグに合う" if best_key and False else None
        matched = []
        # matched nutrients: closest to ideal for this product alone
        single_def = compute_deficit(goal, p.nutrients)
        matched = sorted(single_def.per_nutrient.items(), key=lambda x: x[1])[:2]
        matched_keys = [k for k, _ in matched]

        reason = (
            f"{p.name}：不足しやすい{_jp_nutrient(best_key)}を補う役割。"
            f"目安に近いのは{_jp_nutrient(matched_keys[0])}"
        )
        explanations.append(ProductExplanation(reason=reason, matchedNutrients=[_jp_nutrient(k) for k in matched_keys]))
    return explanations


def _jp_nutrient(key: str) -> str:
    return {
        "protein_g": "たんぱく質",
        "fat_g": "脂質",
        "vitamin_mg": "ビタミン",
        "sugar_g": "糖質",
        "calories_kcal": "カロリー",
    }.get(key, key)


def _jp_mood(mood_tag: str) -> str:
    return {
        "sweet": "甘い",
        "spicy": "辛い",
        "sour": "酸っぱい",
        "refreshing": "さっぱり",
    }.get(mood_tag, mood_tag)


def _overlap_with_used(
    combo: tuple[float, list[Product], Nutrients, float],
    used_ids: set[str],
) -> int:
    return len(used_ids.intersection({p.id for p in combo[1]}))


def _select_meals_diverse(
    pool: list[tuple[float, list[Product], Nutrients, float]],
    k: int,
    temperature: float,
    rng: random.Random,
) -> list[tuple[float, list[Product], Nutrients, float]]:
    """
    スコアと温度で献立を選ぶ。複数件のときは、既に選んだ献立と商品IDが重ならない組を優先する
    （単品の栄養スコアが強い商品が複数候補にばかり入るのを防ぐ）。
    重複ゼロの組が残っていないときは、**重複個数が最小**の組だけに絞ってから選ぶ（緩和時にまた同じ商品ばかり選ばない）。
    """
    if not pool:
        return []
    if k >= len(pool):
        return list(pool)

    remaining = sorted(pool, key=lambda x: x[0], reverse=True)
    selected: list[tuple[float, list[Product], Nutrients, float]] = []
    used_ids: set[str] = set()
    usage_count: defaultdict[str, int] = defaultdict(int)

    while len(selected) < k and remaining:
        feasible = [c for c in remaining if not used_ids.intersection({p.id for p in c[1]})]
        if not feasible:
            overlaps = [_overlap_with_used(c, used_ids) for c in remaining]
            min_o = min(overlaps)
            feasible = [c for c, o in zip(remaining, overlaps) if o == min_o]
        # 同じ重複数なら、すでに多く出たSKUを含む献立をやや下げる（ツナポキ等の定番偏り対策）
        scores = [
            float(c[0]) - 0.22 * sum(usage_count[p.id] for p in c[1])
            for c in feasible
        ]
        if temperature <= 1e-9:
            pick = feasible[max(range(len(feasible)), key=lambda i: scores[i])]
        else:
            m = max(scores)
            logits = [(s - m) / temperature for s in scores]
            exps = [math.exp(min(x, 20.0)) for x in logits]
            total = sum(exps)
            r = rng.random() * total
            acc = 0.0
            pick = feasible[0]
            for i, e in enumerate(exps):
                acc += e
                if acc >= r:
                    pick = feasible[i]
                    break
        selected.append(pick)
        used_ids.update(p.id for p in pick[1])
        for p in pick[1]:
            usage_count[p.id] += 1
        remaining.remove(pick)

    return selected


def suggest_products(
    *,
    moodTag: str,
    budgetMaxYen: float,
    goal: str,
    preferLessSugar: bool = False,
    top_n: int = 5,
) -> tuple[list[Product], list[ProductExplanation]]:
    stats = get_nutrient_stats()
    products = []
    for p in _iter_budget_products(budgetMaxYen):
        products.append(p)

    candidates = []
    for p in products:
        if moodTag in p.moodTags:
            mood_boost = 1.0
        else:
            mood_boost = 0.0

        budget_fit = 1.0 - (p.price_yen / max(budgetMaxYen, 1e-6))
        budget_fit = max(0.0, min(1.0, budget_fit))

        deficit = compute_deficit(goal, p.nutrients).total_deficit
        sugar_penalty = 0.0
        if preferLessSugar:
            # normalized sugar penalty
            sugar_penalty = normalize_nutrients(p.nutrients)["sugar_g"] * 0.4

        score = (2.0 * mood_boost) + (1.0 * budget_fit) - (1.8 * deficit) - sugar_penalty
        candidates.append((score, p))

    candidates.sort(key=lambda x: x[0], reverse=True)
    top = candidates[:top_n]
    top_products = [p for _, p in top]
    explanations: list[ProductExplanation] = []
    for p in top_products:
        per = compute_deficit(goal, p.nutrients).per_nutrient
        closest = sorted(per.items(), key=lambda x: x[1])[:2]
        mood_label = _jp_mood(moodTag)
        if moodTag in p.moodTags:
            reason = f"{p.name}：「{mood_label}」の気分に合い、栄養目安にも近い（特に{_jp_nutrient(closest[0][0])}）。"
        else:
            reason = f"{p.name}：「{mood_label}」とは一致しないが、予算内で栄養目安に近い（特に{_jp_nutrient(closest[0][0])}）。"
        explanations.append(ProductExplanation(reason=reason, matchedNutrients=[_jp_nutrient(k) for k, _ in closest]))
    return top_products, explanations


def _iter_budget_products(budgetMaxYen: float) -> Iterable[Product]:
    # Import locally to avoid circular import
    from ..data_loader import load_products

    for p in load_products():
        if p.price_yen <= budgetMaxYen:
            yield p


def suggest_meal(
    *,
    goal: str,
    moodTag: str,
    budgetMaxYen: float,
    topK: int = 200,
    beam1: int = 80,
    beam2: int = 40,
    final_m: int = 5,
) -> tuple[list[Product], Nutrients, list[ProductExplanation]]:
    from ..data_loader import load_products

    all_products = [p for p in load_products() if p.price_yen <= budgetMaxYen]
    if not all_products:
        raise ValueError("budgetMaxYen内の商品がありません")

    mood_hits = [p for p in all_products if moodTag in p.moodTags]
    # mood優先：一致が多い時は一致のみ、少ない時はペナルティで混ぜる
    min_mood_pool = 20
    if len(mood_hits) >= min_mood_pool:
        pool = mood_hits
    else:
        pool = all_products

    scored: list[tuple[float, int, Product]] = []
    for idx, p in enumerate(pool):
        mood_boost = 1.0 if moodTag in p.moodTags else 0.0
        budget_fit = 1.0 - (p.price_yen / max(budgetMaxYen, 1e-6))
        deficit = compute_deficit(goal, p.nutrients).total_deficit
        score = (2.5 * mood_boost) + (0.9 * budget_fit) - (2.0 * deficit)
        if mood_hits and mood_boost == 0.0:
            score -= 0.8  # mismatch penalty
        scored.append((score, idx, p))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[: min(topK, len(scored))]
    candidates = [p for _, _, p in top]

    if len(candidates) < 3:
        raise ValueError("献立用の候補が不足しています")

    # Step1: beam1 from top candidates
    beam1_list = candidates[: min(beam1, len(candidates))]
    n = len(beam1_list)

    # Pre-compute deficit for partial totals (1 item / 2 items)
    pair_states: list[tuple[float, tuple[int, int], Nutrients, float, list[Product]]] = []
    # enumerate pairs
    for i in range(n - 1):
        for j in range(i + 1, n):
            a = beam1_list[i]
            b = beam1_list[j]
            price_sum = a.price_yen + b.price_yen
            if price_sum > budgetMaxYen:
                continue
            totals = _nutrients_sum(a.nutrients, b.nutrients)
            deficit = compute_deficit(goal, totals).total_deficit
            mood_cov = (1.0 if moodTag in a.moodTags else 0.0) + (1.0 if moodTag in b.moodTags else 0.0)
            score = -deficit + 0.2 * mood_cov
            pair_states.append((score, (i, j), totals, price_sum, [a, b]))

    if not pair_states:
        raise ValueError("予算内の2品組がありません")

    pair_states.sort(key=lambda x: x[0], reverse=True)
    pair_states = pair_states[: min(beam2, len(pair_states))]

    best_combos: list[tuple[float, list[Product], Nutrients]] = []
    # Extend pairs to triples
    for _, (i, j), totals2, price2, items2 in pair_states:
        # third item from whole candidates (ensure distinct by id)
        for c in candidates:
            if c.id in {items2[0].id, items2[1].id}:
                continue
            if price2 + c.price_yen > budgetMaxYen:
                continue
            totals3 = _nutrients_sum(totals2, c.nutrients)
            deficit = compute_deficit(goal, totals3).total_deficit
            mood_cov = sum(1.0 for it in [items2[0], items2[1], c] if moodTag in it.moodTags)

            # small diversity penalty: too many from same category
            cats = [it.category for it in [items2[0], items2[1], c]]
            same_cat = sum(1 for k in cats if cats.count(k) >= 2)
            diversity_penalty = 0.1 * same_cat

            combo_score = (-deficit) + (0.25 * mood_cov) - diversity_penalty
            best_combos.append((combo_score, [items2[0], items2[1], c], totals3))

    if not best_combos:
        raise ValueError("予算内の3品組がありません")

    best_combos.sort(key=lambda x: x[0], reverse=True)
    best = best_combos[: min(final_m, len(best_combos))]

    # LLM boundary stub: pick the best deterministically
    selected_items, selected_totals = best[0][1], best[0][2]

    explanations = _meal_to_explanations(goal, selected_items, selected_totals)
    return selected_items, selected_totals, explanations


def suggest_meals(
    *,
    goal: str,
    moodTag: str,
    budgetMinYen: float,
    budgetMaxYen: float,
    top_meals: int = 3,
    topK: int = 200,
    beam1: int = 80,
    beam2: int = 40,
    final_m: int = 5,
    temperature: float = 0.75,
    use_vector_features: bool = True,
    seed: Optional[int] = None,
) -> list[tuple[list[Product], Nutrients, list[ProductExplanation], float]]:
    """
    おすすめメニューの複数候補を返す（合計金額を budgetMinYen..budgetMaxYen に絞る）。
    temperature: 大きいほどスコアに関係なくバラつく（0 に近いと上位固定）。
    use_vector_features: 正規化栄養ベクトルとゴール理想中心のコサイン類似度をスコアに加算。
    """
    from ..data_loader import load_products

    rng = random.Random(seed) if seed is not None else random.Random()
    vec_center = goal_center_vector(goal)

    all_products = [p for p in load_products() if p.price_yen <= budgetMaxYen]
    if not all_products:
        raise ValueError("budgetMaxYen内の商品がありません")

    mood_hits = [p for p in all_products if moodTag in p.moodTags]
    min_mood_pool = 20
    if len(mood_hits) >= min_mood_pool:
        pool = mood_hits
    else:
        pool = all_products

    scored: list[tuple[float, int, Product]] = []
    for idx, p in enumerate(pool):
        mood_boost = 1.0 if moodTag in p.moodTags else 0.0
        budget_fit = 1.0 - (p.price_yen / max(budgetMaxYen, 1e-6))
        deficit = compute_deficit(goal, p.nutrients).total_deficit
        score = (2.5 * mood_boost) + (0.9 * budget_fit) - (2.0 * deficit)
        if mood_hits and mood_boost == 0.0:
            score -= 0.8  # mismatch penalty
        scored.append((score, idx, p))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[: min(topK, len(scored))]
    candidates = [p for _, _, p in top]

    if len(candidates) < 3:
        raise ValueError("献立用の候補が不足しています")

    # スコア順のままだと同じSKUが常にビーム先頭に入り、献立が偏るので上位帯だけ順序を撹乱する
    head_n = min(56, len(candidates))
    head = candidates[:head_n]
    rng.shuffle(head)
    candidates = head + candidates[head_n:]

    beam1_list = candidates[: min(beam1, len(candidates))]
    n = len(beam1_list)

    pair_states: list[tuple[float, tuple[int, int], Nutrients, float, list[Product]]] = []
    for i in range(n - 1):
        for j in range(i + 1, n):
            a = beam1_list[i]
            b = beam1_list[j]
            price_sum = a.price_yen + b.price_yen
            if price_sum > budgetMaxYen:
                continue
            totals = _nutrients_sum(a.nutrients, b.nutrients)
            deficit = compute_deficit(goal, totals).total_deficit
            mood_cov = (1.0 if moodTag in a.moodTags else 0.0) + (1.0 if moodTag in b.moodTags else 0.0)
            score = -deficit + 0.2 * mood_cov
            pair_states.append((score, (i, j), totals, price_sum, [a, b]))

    if not pair_states:
        raise ValueError("予算内の2品組がありません")

    pair_states.sort(key=lambda x: x[0], reverse=True)
    pair_states = pair_states[: min(beam2, len(pair_states))]

    best_combos: list[tuple[float, list[Product], Nutrients, float]] = []
    for _, (i, j), totals2, price2, items2 in pair_states:
        for c in candidates:
            if c.id in {items2[0].id, items2[1].id}:
                continue

            total_price = price2 + c.price_yen
            if total_price > budgetMaxYen:
                continue
            if total_price < budgetMinYen:
                continue

            totals3 = _nutrients_sum(totals2, c.nutrients)
            deficit = compute_deficit(goal, totals3).total_deficit
            mood_cov = sum(1.0 for it in [items2[0], items2[1], c] if moodTag in it.moodTags)

            cats = [it.category for it in [items2[0], items2[1], c]]
            same_cat = sum(1 for k in cats if cats.count(k) >= 2)
            diversity_penalty = 0.1 * same_cat

            if use_vector_features:
                mv = meal_normalized_vector(totals3)
                vec_sim = cosine_similarity_dict(mv, vec_center)
                combo_score = (-deficit) + (0.25 * vec_sim) + (0.25 * mood_cov) - diversity_penalty
            else:
                combo_score = (-deficit) + (0.25 * mood_cov) - diversity_penalty
            best_combos.append((combo_score, [items2[0], items2[1], c], totals3, total_price))

    if not best_combos:
        raise ValueError("合計金額が指定レンジに収まる3品組がありません")

    best_combos.sort(key=lambda x: x[0], reverse=True)
    pool_cap = max(final_m, top_meals * 15) if temperature > 1e-9 else final_m
    best_combos = best_combos[: min(pool_cap, len(best_combos))]

    selected = _select_meals_diverse(
        best_combos,
        min(top_meals, len(best_combos)),
        temperature,
        rng,
    )
    results: list[tuple[list[Product], Nutrients, list[ProductExplanation], float]] = []
    for combo_score, items, totals, total_price in selected:
        explanations = _meal_to_explanations(goal, items, totals)
        results.append((items, totals, explanations, total_price))

    return results


def suggest_addon(
    *,
    goal: str,
    mealItems: list[str],
    budgetMaxAdditionalYen: float,
) -> tuple[Product, list[str], str]:
    from ..data_loader import load_products

    products = load_products()
    by_id = {p.id: p for p in products}
    missing = [pid for pid in mealItems if pid not in by_id]
    if missing:
        raise ValueError(f"商品IDが存在しません: {missing[:3]}")

    items = [by_id[pid] for pid in mealItems]
    totals = Nutrients(
        protein_g=sum(p.nutrients.protein_g for p in items),
        fat_g=sum(p.nutrients.fat_g for p in items),
        vitamin_mg=sum(p.nutrients.vitamin_mg for p in items),
        sugar_g=sum(p.nutrients.sugar_g for p in items),
        calories_kcal=sum(p.nutrients.calories_kcal for p in items),
    )

    current_def = compute_deficit(goal, totals)

    best: Optional[tuple[float, Product, DeficitResult]] = None
    for p in products:
        if p.id in mealItems:
            continue
        if p.price_yen > budgetMaxAdditionalYen:
            continue
        new_totals = _nutrients_sum(totals, p.nutrients)
        new_def = compute_deficit(goal, new_totals)
        improvement = current_def.total_deficit - new_def.total_deficit
        # improvementが小さければ意味が薄い
        if best is None or improvement > best[0]:
            best = (improvement, p, new_def)

    if best is None:
        raise ValueError("追加候補がありません（予算内に商品がない）")

    _, addon, new_def = best

    # deficits (which nutrients are still far from ideal after addon)
    deficits_sorted = sorted(new_def.per_nutrient.items(), key=lambda x: x[1], reverse=True)
    deficit_keys = [k for k, d in deficits_sorted[:2] if d > 0.001]
    deficit_keys = deficit_keys or [deficits_sorted[0][0]]

    reason = f"不足しやすい{_jp_nutrient(deficit_keys[0])}を中心に、献立の目安域へ近づけます。"
    return addon, [_jp_nutrient(k) for k in deficit_keys], reason


def suggest_products_for_backend(
    moodTag: str,
    budgetMaxYen: float,
    preferLessSugar: bool,
    goal: str,
) -> tuple[list[Product], list[ProductExplanation]]:
    return suggest_products(
        moodTag=moodTag,
        budgetMaxYen=budgetMaxYen,
        preferLessSugar=preferLessSugar,
        goal=goal,
    )

