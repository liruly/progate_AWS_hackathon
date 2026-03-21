import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell.jsx";
import { useOrder } from "../context/OrderContext.jsx";
import { apiSuggestMeals } from "../api.js";

function formatYen(n) {
  return `${Math.round(n).toLocaleString("ja-JP")}円`;
}

const TIER_LABEL = { light: "ヘルシー", normal: "普通", hearty: "がっつり" };

function makeFallbackMeals() {
  // UIに必要なフィールドだけを最低限埋めるダミー候補（合計1000〜1200円）
  /** @type {Array<{ id: string, name: string, category: string, price_yen: number, nutrients: any }>} */
  const mkProduct = (id, name, category, price_yen, calories, protein_g, fat_g, vitamin_mg, sugar_g) => ({
    id,
    name,
    category,
    price_yen,
    moodTags: [],
    nutrients: { protein_g, fat_g, vitamin_mg, sugar_g, calories_kcal: calories },
  });

  const sumTotals = (items) => {
    const totals = {
      protein_g: 0,
      fat_g: 0,
      vitamin_mg: 0,
      sugar_g: 0,
      calories_kcal: 0,
    };
    for (const p of items) {
      totals.protein_g += p.nutrients.protein_g;
      totals.fat_g += p.nutrients.fat_g;
      totals.vitamin_mg += p.nutrients.vitamin_mg;
      totals.sugar_g += p.nutrients.sugar_g;
      totals.calories_kcal += p.nutrients.calories_kcal;
    }
    return totals;
  };

  const mkMeal = (priceTarget, products, reasonPrefix) => {
    const totalPriceYen = products.reduce((a, p) => a + p.price_yen, 0);
    const totals = sumTotals(products);
    const explanations = products.map((p, idx) => ({
      reason: `${reasonPrefix}${idx + 1}：${p.name} を入れたセットです。`,
      matchedNutrients: [],
    }));
    return { mealItems: products, totals, explanations, totalPriceYen: totalPriceYen ?? priceTarget };
  };

  // 例: 1000, 1100, 1200
  const mealA = mkMeal(
    1000,
    [
      mkProduct("dA1", "野菜スープ", "food", 320, 95, 4, 2, 10, 3),
      mkProduct("dA2", "サラダチキン", "food", 420, 210, 20, 7, 8, 1),
      mkProduct("dA3", "カットフルーツ", "food", 260, 120, 2, 1, 12, 22),
    ],
    "軽め",
  );
  const mealB = mkMeal(
    1100,
    [
      mkProduct("dB1", "おにぎり（鮭）", "food", 420, 230, 6, 3, 2, 1),
      mkProduct("dB2", "サラダ", "food", 350, 110, 3, 5, 15, 6),
      mkProduct("dB3", "ドリンク", "beverage", 330, 90, 1, 0, 0, 14),
    ],
    "バランス",
  );
  const mealC = mkMeal(
    1200,
    [
      mkProduct("dC1", "焼きそば", "food", 520, 420, 12, 15, 0, 8),
      mkProduct("dC2", "唐揚げ", "food", 380, 330, 20, 18, 2, 2),
      mkProduct("dC3", "スイーツ", "food", 300, 190, 3, 6, 0, 25),
    ],
    "がっつり",
  );

  return [mealA, mealB, mealC];
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
          <div className="menu-recommend-list">
            {meals.map((m, idx) => (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                aria-label="このセットを引き換える"
                className="menu-recommend-row"
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
                <div className="menu-recommend-items">
                  {m.mealItems.map((p, pidx) => (
                    <div key={p.id} className="menu-recommend-item">
                      <div className="menu-recommend-item__name">{p.name}</div>
                      <div className="menu-recommend-item__reason">{m.explanations?.[pidx]?.reason}</div>
                      <div className="menu-recommend-item__meta">
                        <span>{formatYen(p.price_yen)}</span>
                        <span>{Math.round(p.nutrients.calories_kcal)} kcal</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="menu-recommend-calorie-wrap">
                  <div className="menu-recommend-calorie-box">
                    <span className="menu-recommend-calorie-box__label">合計カロリー</span>
                    <span className="menu-recommend-calorie-box__value">{Math.round(m.totals.calories_kcal)} kcal</span>
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
