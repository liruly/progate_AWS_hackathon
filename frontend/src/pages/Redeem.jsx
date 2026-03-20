import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiCouponMock, apiCouponMockScan } from "../api.js";
import { AppShell } from "../components/AppShell.jsx";
import { useOrder } from "../context/OrderContext.jsx";

export function Redeem() {
  const { store, meal, ticketsRemaining, consumeTicket, resetFlow } = useOrder();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!meal) return;

    let cancelled = false;
    setLoading(true);
    // デモ: スキャンはUIに出さず、成功したらチケットだけ減算する
    const ids = meal.mealItems.map((p) => p.id);
    apiCouponMock({ mealItems: ids })
      .then((res) => apiCouponMockScan({ couponId: res?.couponId }))
      .then((scanRes) => {
        if (cancelled) return;
        if (scanRes?.used) {
          if (ticketsRemaining > 0) consumeTicket();
        }
      })
      .catch(() => {
        // UI上は何も出さない（デモ）
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [meal, consumeTicket, ticketsRemaining]);

  if (!store) {
    return <Navigate to="/store" replace />;
  }
  if (!meal) {
    return <Navigate to="/menu" replace />;
  }

  return (
    <AppShell step={5}>
      <section className="card page-section">
        <h1 className="hero-title" style={{ marginTop: 0 }}>
          引き換え
        </h1>
        <p className="hero-desc">
          サブスク会員の<strong>引換チケット</strong>で、選んだ店舗を起点に在庫がある場所で受け取る想定です（デモ）。
        </p>

        <div className="ticket-banner">
          <div className="ticket-banner__title">サブスク引換チケット</div>
          <p className="ticket-banner__body">
            1セットの引き換えに <strong>チケット 1 枚</strong> を使用します。
            <br />
            残り <strong>{ticketsRemaining}</strong> 枚
          </p>
        </div>
        <p className="muted" style={{ marginTop: 16 }}>
          {loading ? "処理中…" : "（デモ）引き換え準備が完了しました。"}
        </p>

        <div style={{ marginTop: 16 }}>
          <Link
            to="/store"
            className="link-next"
            style={{ display: "inline-block", marginTop: 12 }}
            onClick={() => resetFlow()}
          >
            最初からやり直す
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
