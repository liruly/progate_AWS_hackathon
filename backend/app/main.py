from __future__ import annotations

from threading import Lock

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .data_loader import load_products
from .logic.suggest import suggest_addon, suggest_meal, suggest_meals, suggest_products
from .schemas import (
    CheckoutCouponMockRequest,
    CouponMockResponse,
    CouponScanMockRequest,
    CouponScanMockResponse,
    Product,
    SuggestAddonRequest,
    SuggestAddonResponse,
    SuggestMealRequest,
    SuggestMealResponse,
    SuggestMealsRequest,
    SuggestMealsResponse,
    SuggestProductsRequest,
    SuggestProductsResponse,
)


app = FastAPI(title="Hackathon Nutrition Suggest API")

_TICKETS_REMAINING = 3  # デモ用（プロセス内保持）。本番では永続化が必要。
_TICKETS_LOCK = Lock()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/products", response_model=list[Product])
def api_products() -> list[Product]:
    return load_products()


@app.post("/api/suggest/products", response_model=SuggestProductsResponse)
def api_suggest_products(req: SuggestProductsRequest) -> SuggestProductsResponse:
    products, explanations = suggest_products(
        moodTag=req.moodTag,
        budgetMaxYen=req.budgetMaxYen,
        goal=req.goal or "balanced",
        preferLessSugar=bool(req.preferLessSugar),
    )
    return SuggestProductsResponse(products=products, explanations=explanations)


def _resolve_goal_budget(req: SuggestMealRequest) -> tuple[str, float]:
    """カロリーティアがあれば栄養ゴールに合わせる（商品プール整理用の上限金額。UI上の予算とは無関係）。"""
    if req.calorieTier == "light":
        return "diet", 1000.0
    if req.calorieTier == "hearty":
        return "muscle_bulk", 1200.0
    if req.calorieTier == "normal":
        return "balanced", 1100.0
    return req.goal, float(req.budgetMaxYen)


@app.post("/api/suggest/meal", response_model=SuggestMealResponse)
def api_suggest_meal(req: SuggestMealRequest) -> SuggestMealResponse:
    goal, budget = _resolve_goal_budget(req)
    try:
        mealItems, totals, explanations = suggest_meal(
            goal=goal,
            moodTag=req.moodTag,
            budgetMaxYen=budget,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    total_price = sum(p.price_yen for p in mealItems)
    return SuggestMealResponse(
        mealItems=mealItems,
        totals=totals,
        explanations=explanations,
        totalPriceYen=total_price,
    )


def _resolve_goal(req: SuggestMealsRequest) -> str:
    if req.calorieTier == "light":
        return "diet"
    if req.calorieTier == "hearty":
        return "muscle_bulk"
    if req.calorieTier == "normal":
        return "balanced"
    return req.goal or "balanced"


@app.post("/api/suggest/meals", response_model=SuggestMealsResponse)
def api_suggest_meals(req: SuggestMealsRequest) -> SuggestMealsResponse:
    # UI要望: 合計金額を 1000円以上〜1200円以内にする
    budgetMinYen = 1000.0
    budgetMaxYen = 1200.0

    goal = _resolve_goal(req)
    try:
        combos = suggest_meals(
            goal=goal,
            moodTag=req.moodTag,
            budgetMinYen=budgetMinYen,
            budgetMaxYen=budgetMaxYen,
            top_meals=req.topN,
            topK=260,
            beam1=120,
            beam2=70,
            final_m=25,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    meals = []
    for items, totals, explanations, total_price in combos:
        meals.append(
            {
                "mealItems": items,
                "totals": totals,
                "explanations": explanations,
                "totalPriceYen": total_price,
            }
        )
    return SuggestMealsResponse(meals=meals)


@app.post("/api/suggest/addon", response_model=SuggestAddonResponse)
def api_suggest_addon(req: SuggestAddonRequest) -> SuggestAddonResponse:
    try:
        addon, deficits, reason = suggest_addon(
            goal=req.goal,
            mealItems=req.mealItems,
            budgetMaxAdditionalYen=req.budgetMaxAdditionalYen,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return SuggestAddonResponse(addonProduct=addon, deficits=deficits, reason=reason)


@app.post("/api/checkout/coupon/mock", response_model=CouponMockResponse)
def api_coupon_mock(req: CheckoutCouponMockRequest) -> CouponMockResponse:
    # デモ用: 固定のサブスク引換クーポン
    return CouponMockResponse(
        couponId="SUBSCRIPTION_0YEN_MOCK",
        discountYen=0,
        barcodeValue="000000000000",
        barcodeFormat="CODE128",
    )


@app.post("/api/checkout/coupon/mock/scan", response_model=CouponScanMockResponse)
def api_coupon_mock_scan(req: CouponScanMockRequest) -> CouponScanMockResponse:
    # デモ用: バーコードがスキャンされたら「使用された」扱いにする
    # ※残数もサーバー側で保持して返す（進捗表示/画面遷移で勝手に減らないため）
    global _TICKETS_REMAINING
    with _TICKETS_LOCK:
        if _TICKETS_REMAINING > 0:
            _TICKETS_REMAINING -= 1
            used = True
        else:
            used = False
        return CouponScanMockResponse(used=used, ticketsRemaining=_TICKETS_REMAINING)
