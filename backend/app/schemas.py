from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class Nutrients(BaseModel):
    protein_g: float = Field(..., ge=0)
    fat_g: float = Field(..., ge=0)
    vitamin_mg: float = Field(..., ge=0)
    sugar_g: float = Field(..., ge=0)
    calories_kcal: float = Field(..., ge=0)


class Product(BaseModel):
    id: str
    name: str
    price_yen: float = Field(..., ge=0)
    category: str
    moodTags: list[str] = []
    nutrients: Nutrients


class ProductExplanation(BaseModel):
    reason: str
    matchedNutrients: list[str] = []


class SuggestProductsRequest(BaseModel):
    moodTag: str
    budgetMaxYen: float = Field(..., gt=0)
    preferLessSugar: Optional[bool] = False
    goal: Optional[str] = "balanced"  # 未指定時は balanced


class SuggestProductsResponse(BaseModel):
    products: list[Product] = []
    explanations: list[ProductExplanation] = []


class SuggestMealRequest(BaseModel):
    goal: str = "balanced"
    moodTag: str
    budgetMaxYen: float = Field(default=1100, gt=0)
    # ヘルシー/普通/がっつり → goal と探索用上限金額をサーバー側で上書き（指定時／UIの予算入力とは無関係）
    calorieTier: Optional[Literal["light", "normal", "hearty"]] = None


class SuggestMealResponse(BaseModel):
    mealItems: list[Product] = []
    totals: Nutrients
    explanations: list[ProductExplanation] = []
    totalPriceYen: float = 0


class SuggestMealOption(BaseModel):
    mealItems: list[Product] = []
    totals: Nutrients
    explanations: list[ProductExplanation] = []
    totalPriceYen: float = 0


class SuggestMealsRequest(BaseModel):
    goal: str = "balanced"
    moodTag: str
    calorieTier: Optional[Literal["light", "normal", "hearty"]] = None
    topN: int = 3


class SuggestMealsResponse(BaseModel):
    meals: list[SuggestMealOption] = []


class SuggestAddonRequest(BaseModel):
    mealItems: list[str]  # product ids
    budgetMaxAdditionalYen: float = Field(..., gt=0)
    goal: str = "balanced"


class SuggestAddonResponse(BaseModel):
    addonProduct: Product
    deficits: list[str] = []
    reason: str


class CouponMockResponse(BaseModel):
    couponId: str
    discountYen: float
    barcodeValue: str
    barcodeFormat: Literal["CODE128"] = "CODE128"


class CheckoutCouponMockRequest(BaseModel):
    mealItems: list[str] = []


class CouponScanMockRequest(BaseModel):
    couponId: str


class CouponScanMockResponse(BaseModel):
    used: bool
    ticketsRemaining: int = 0
