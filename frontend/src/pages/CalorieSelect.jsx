import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell.jsx";
import { useOrder } from "../context/OrderContext.jsx";

const TIERS = [
  {
    id: "light",
    label: "ヘルシー",
    desc: "軽めのひと食分・すっきりしたカロリー感",
    emoji: "🥗",
  },
  {
    id: "normal",
    label: "普通",
    desc: "バランスよく、標準的なボリューム",
    emoji: "🍱",
  },
  {
    id: "hearty",
    label: "がっつり",
    desc: "しっかりエネルギー・満足感のあるボリューム",
    emoji: "🍖",
  },
];

export function CalorieSelect() {
  const navigate = useNavigate();
  const { store, calorieTier, setCalorieTier } = useOrder();

  if (!store) {
    return <Navigate to="/store" replace />;
  }

  return (
    <AppShell step={3}>
      <section className="card page-section">
        <h1 className="hero-title" style={{ marginTop: 0 }}>
          カロリー
        </h1>
        <p className="hero-desc">
          ひと食分のカロリー感（ボリューム）に近いものを選んでください。ここでは金額の目安は出しません。献立が決まったあとに、各商品の栄養データから合計 kcal を算出します。
        </p>

        <div className="tier-grid">
          {TIERS.map((t) => {
            const selected = calorieTier === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`tier-card ${selected ? "selected" : ""}`}
                onClick={() => {
                  setCalorieTier(t.id);
                  navigate("/menu");
                }}
              >
                <span className="tier-card__emoji">{t.emoji}</span>
                <span className="tier-card__label">{t.label}</span>
                <span className="tier-card__desc">{t.desc}</span>
              </button>
            );
          })}
        </div>

        <p className="hint" style={{ marginTop: 16, marginBottom: 0 }}>
          カードをタップするとおすすめメニューへ進みます。
        </p>

        <div className="actions-row" style={{ marginTop: 24 }}>
          <button type="button" onClick={() => navigate(-1)}>
            戻る
          </button>
        </div>
      </section>
    </AppShell>
  );
}
