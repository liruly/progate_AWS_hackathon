<<<<<<< HEAD
import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell.jsx";
import { useOrder } from "../context/OrderContext.jsx";

function formatYen(n) {
  return `${Math.round(n).toLocaleString("ja-JP")}円`;
}

function formatCategory(cat) {
  if (cat === "beverage") return "飲料";
  if (cat === "food") return "食品";
  return cat;
}

const TIER_LABEL = { light: "ヘルシー", normal: "普通", hearty: "がっつり" };

function makeDummyMeals() {
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
    "軽め"
  );
  const mealB = mkMeal(
    1100,
    [
      mkProduct("dB1", "おにぎり（鮭）", "food", 420, 230, 6, 3, 2, 1),
      mkProduct("dB2", "サラダ", "food", 350, 110, 3, 5, 15, 6),
      mkProduct("dB3", "ドリンク", "beverage", 330, 90, 1, 0, 0, 14),
    ],
    "バランス"
  );
  const mealC = mkMeal(
    1200,
    [
      mkProduct("dC1", "焼きそば", "food", 520, 420, 12, 15, 0, 8),
      mkProduct("dC2", "唐揚げ", "food", 380, 330, 20, 18, 2, 2),
      mkProduct("dC3", "スイーツ", "food", 300, 190, 3, 6, 0, 25),
    ],
    "がっつり"
  );

  return [mealA, mealB, mealC];
}

export function MenuRecommend() {
  const navigate = useNavigate();
  const { store, calorieTier, setMeal, resetFlow } = useOrder();
  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState([]);

  useEffect(() => {
    if (!store || !calorieTier) return;

    setMeals([]);
    setMeal(null);
    setLoading(true);
    setMeals(makeDummyMeals());
    setLoading(false);
  }, [store, calorieTier, setMeals, setMeal]);

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

        {!loading && meals.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px", marginTop: "24px" }}>
            {meals.map((m, idx) => (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                aria-label="このセットを引き換える"
                style={{
                  display: "flex",
                  alignItems: "center", // 中央揃え
                  justifyContent: "space-between",
                  gap: "16px",
                  cursor: "pointer",
                  paddingBottom: "16px",
                  borderBottom: idx !== meals.length - 1 ? "1px solid #e5e7eb" : "none",
                }}
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
                {/* 左側：商品の詳細情報を横並びで表示（画像を削除） */}
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", flex: 1 }}>
                  {m.mealItems.map((p, pidx) => (
                    <div 
                      key={p.id}
                      style={{
                        backgroundColor: "#f9fafb", // 薄いグレーの背景
                        border: "1px solid #e5e7eb", // 薄い枠線
                        padding: "8px 12px",
                        borderRadius: "8px",
                        minWidth: "150px", // 最小幅を少し持たせて見やすく
                        flex: "1 1 150px"  // 余白があれば横に広がる
                      }}
                    >
                      {/* 商品名 */}
                      <div style={{ fontWeight: "bold", marginBottom: "4px", color: "#374151", fontSize: "0.9rem" }}>
                        {p.name}
                      </div>
                      {/* 商品の紹介（選ばれた理由など） */}
                      <div style={{ color: "#6b7280", fontSize: "0.75rem", marginBottom: "8px", lineHeight: "1.4" }}>
                        {m.explanations?.[pidx]?.reason}
                      </div>
                      {/* 値段とカロリー */}
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#4b5563", fontWeight: "bold", fontSize: "0.85rem" }}>
                        <span>{p.price_yen}円</span>
                        <span>{Math.round(p.nutrients.calories_kcal)} kcal</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 右側：カロリー表示の枠のみ */}
                <div style={{ flexShrink: 0 }}>
                  <div
                    style={{
                      width: "120px",
                      height: "80px",
                      backgroundColor: "#ffffff",
                      border: "2px solid #f59e0b",
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", color: "#666" }}>合計カロリー</span>
                    <span style={{ fontWeight: "bold", color: "#444" }}>{Math.round(m.totals.calories_kcal)} kcal</span>
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
=======
import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell.jsx";
import { useOrder } from "../context/OrderContext.jsx";

function formatYen(n) {
  return `${Math.round(n).toLocaleString("ja-JP")}円`;
}

function formatCategory(cat) {
  if (cat === "beverage") return "飲料";
  if (cat === "food") return "食品";
  return cat;
}

const TIER_LABEL = { light: "ヘルシー", normal: "普通", hearty: "がっつり" };

function makeDummyMeals() {
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
    "軽め"
  );
  const mealB = mkMeal(
    1100,
    [
      mkProduct("dB1", "おにぎり（鮭）", "food", 420, 230, 6, 3, 2, 1),
      mkProduct("dB2", "サラダ", "food", 350, 110, 3, 5, 15, 6),
      mkProduct("dB3", "ドリンク", "beverage", 330, 90, 1, 0, 0, 14),
    ],
    "バランス"
  );
  const mealC = mkMeal(
    1200,
    [
      mkProduct("dC1", "焼きそば", "food", 520, 420, 12, 15, 0, 8),
      mkProduct("dC2", "唐揚げ", "food", 380, 330, 20, 18, 2, 2),
      mkProduct("dC3", "スイーツ", "food", 300, 190, 3, 6, 0, 25),
    ],
    "がっつり"
  );

  return [mealA, mealB, mealC];
}

export function MenuRecommend() {
  const navigate = useNavigate();
  const { store, calorieTier, setMeal, resetFlow } = useOrder();
  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState([]);

  useEffect(() => {
    if (!store || !calorieTier) return;

    setMeals([]);
    setMeal(null);
    setLoading(true);
    setMeals(makeDummyMeals());
    setLoading(false);
  }, [store, calorieTier, setMeals, setMeal]);

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
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={loading}
          >
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

        {!loading && meals.length > 0 ? (
          <div
            className="menu-recommend-grid"
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "0.85rem",
            }}
          >
            {meals.map((m, idx) => (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                aria-label="このセットを引き換える"
                className="card"
                style={{ background: "rgba(255,255,255,0.92)", padding: "1rem", cursor: "pointer" }}
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
                <div className="menu-summary card" style={{ marginTop: 0, background: "rgba(251, 146, 60, 0.1)" }}>
                  <div className="menu-summary__row muted" style={{ fontSize: "0.85rem" }}>
                    <span>合計カロリー</span>
                    <span>{Math.round(m.totals.calories_kcal)} kcal</span>
                  </div>
                </div>

                <div className="product-grid" style={{ marginTop: 14 }}>
                  {m.mealItems.map((p, pidx) => (
                    <article key={p.id} className="product-card">
                      <h3 className="product-name">{p.name}</h3>
                      <p className="product-meta">
                        <span className="tag-inline">{formatCategory(p.category)}</span>
                        {formatYen(p.price_yen)}
                      </p>
                      <p className="product-reason">{m.explanations?.[pidx]?.reason}</p>
                      <p className="product-foot">{Math.round(p.nutrients.calories_kcal)} kcal</p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
>>>>>>> origin/prototype
