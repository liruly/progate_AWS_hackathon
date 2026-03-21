import React, { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiCouponMock, apiCouponMockScan } from "../api.js";
import { AppShell } from "../components/AppShell.jsx";
import { useOrder } from "../context/OrderContext.jsx";

export function Redeem() {
  const { store, meal, ticketsRemaining, syncTicketsRemaining, resetFlow } = useOrder();
  const [loading, setLoading] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [couponId, setCouponId] = useState(null);

  const handleRedeem = async () => {
    if (!meal || loading || redeemed || ticketsRemaining <= 0) return;
    setLoading(true);
    try {
      // デモ: バーコードスキャンを模擬し、成功したらチケットだけ減算する
      const ids = meal.mealItems.map((p) => p.id);
      const res = await apiCouponMock({ mealItems: ids });
      setCouponId(res?.couponId ?? null);
      const scanRes = await apiCouponMockScan({ couponId: res?.couponId });
      if (scanRes?.used) {
        // デモ: 表示は常に「今の枚数 −1」（APIの残数が欠落/不整合でも 3→2→1→0 になる）
        syncTicketsRemaining(ticketsRemaining - 1);
        setRedeemed(true);
      }
    } catch {
      // UI上は何も出さない（デモ）
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (couponId) {
      JsBarcode("#barcode", couponId);
    }
  }, [couponId]);

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

        {couponId && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <svg id="barcode"></svg>
          </div>
        )}

        <p className="muted" style={{ marginTop: 16 }}>
          {loading
            ? "スキャン中…"
            : redeemed
              ? "引き換えが完了しました（デモ）。"
              : ticketsRemaining <= 0
                ? "引換チケットがありません。"
                : "（デモ）店舗で引換券をスキャンしてください。"}
        </p>

        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            className="primary"
            onClick={handleRedeem}
            disabled={loading || redeemed || ticketsRemaining <= 0}
            style={{ display: "inline-block", marginTop: 12 }}
          >
            {ticketsRemaining <= 0 ? "引換チケットなし" : redeemed ? "引き換え済み" : "引換券をスキャン（デモ）"}
          </button>
        </div>

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
