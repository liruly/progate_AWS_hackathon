import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell.jsx";
import { useOrder } from "../context/OrderContext.jsx";
import { apiSuggestMeals } from "../api.js";
import fallbackMealsJson from "../data/fallback-meals.json";

const TIER_LABEL = { light: "ヘルシー", normal: "普通", hearty: "がっつり" };

function makeFallbackMeals() {
  return fallbackMealsJson.meals;
}

export function MenuRecommend() {
  const navigate = useNavigate();
  const { store, moodTag, calorieTier, setMeal, resetFlow } = useOrder();
  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!store || !calorieTier) return;

    setMeals([]);
    setMeal(null);
    setErrorMsg("");
    setLoading(true);
    (async () => {
      try {
        const res = await apiSuggestMeals({ moodTag, calorieTier, topN: 3 });
        setMeals(res?.meals ?? []);
      } catch (e) {
        console.error(e);
        setErrorMsg("メニュー生成に失敗しました。デモ用の候補を表示します。");
        setMeals(makeFallbackMeals());
      } finally {
        setLoading(false);
      }
    })();
  }, [store, moodTag, calorieTier, setMeal]);

  if (!store || !calorieTier) {
    return <Navigate to="/store" replace />;
  }

  return (
    <AppShell step={4}>
      <section className="card page-section">
        <h1 className="hero-title" style={{ marginTop: 0 }}>
          おすすめメニュー
        </h1>
        <p className="hero-desc">
          {TIER_LABEL[calorieTier]}に合わせて3通りを提案します。合計カロリー（kcal）は商品の栄養値から自動集計しています。
        </p>

        <div className="actions-row" style={{ marginTop: 12 }}>
          <button type="button" onClick={() => navigate(-1)} disabled={loading}>
            戻る
          </button>
          <button
            type="button"
            onClick={() => {
              resetFlow();
              navigate("/store");
            }}
            disabled={loading}
          >
            やり直す
          </button>
        </div>

        {loading ? <p className="muted">メニューを生成しています…</p> : null}
        {!loading && errorMsg ? <p className="muted">{errorMsg}</p> : null}

        {!loading && meals.length > 0 ? (
          <div className="menu-recommend-meals">
            {meals.map((m, idx) => (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                aria-label="このセットを引き換える"
                className="menu-recommend-meal"
                onClick={() => {
                  setMeal(m);
                  navigate("/redeem");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setMeal(m);
                    navigate("/redeem");
                  }
                }}
              >
                <div className="menu-recommend-meal-items">
                  {m.mealItems.map((p, pidx) => (
                    <div key={p.id} className="menu-recommend-food-card">
                      <div style={{ fontWeight: "bold", marginBottom: "4px", color: "#374151", fontSize: "0.9rem" }}>
                        {p.name}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: "0.75rem", marginBottom: "8px", lineHeight: "1.4" }}>
                        {m.explanations?.[pidx]?.reason}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          color: "#4b5563",
                          fontWeight: "bold",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span>{p.price_yen}円</span>
                        <span>{Math.round(p.nutrients.calories_kcal)} kcal</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="menu-recommend-calorie-wrap" style={{ flexShrink: 0 }}>
                  <div className="menu-recommend-calorie-inner">
                    <span className="menu-recommend-calorie-label">合計カロリー</span>
                    <span className="menu-recommend-calorie-value">{Math.round(m.totals.calories_kcal)} kcal</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
