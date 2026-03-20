const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function postJson(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.detail ? String(data.detail) : `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

async function getJson(path) {
  const res = await fetch(`${API_BASE_URL}${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.detail ? String(data.detail) : `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export function apiGetProducts() {
  return getJson("/api/products");
}

export function apiSuggestProducts({ moodTag, budgetMaxYen, preferLessSugar = false, goal = "balanced" }) {
  return postJson("/api/suggest/products", { moodTag, budgetMaxYen, preferLessSugar, goal });
}

/**
 * @param {{ moodTag: string, calorieTier?: 'light'|'normal'|'hearty', goal?: string, budgetMaxYen?: number }} p
 */
export function apiSuggestMeal({ moodTag, calorieTier, goal = "balanced", budgetMaxYen = 1100 }) {
  const body = { moodTag, goal, budgetMaxYen };
  if (calorieTier) body.calorieTier = calorieTier;
  return postJson("/api/suggest/meal", body);
}

export function apiSuggestMeals({ moodTag, calorieTier, goal = "balanced", topN = 3 }) {
  const body = { moodTag, goal, topN };
  if (calorieTier) body.calorieTier = calorieTier;
  return postJson("/api/suggest/meals", body);
}

export function apiSuggestAddon({ mealItems, budgetMaxAdditionalYen, goal }) {
  return postJson("/api/suggest/addon", { mealItems, budgetMaxAdditionalYen, goal });
}

export function apiCouponMock({ mealItems = [] } = {}) {
  return postJson("/api/checkout/coupon/mock", { mealItems });
}

export function apiCouponMockScan({ couponId }) {
  return postJson("/api/checkout/coupon/mock/scan", { couponId });
}
