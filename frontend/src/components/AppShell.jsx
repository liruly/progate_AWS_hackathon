import React from "react";
import { Link } from "react-router-dom";
import { StepProgress } from "./StepProgress.jsx";
import { useOrder } from "../context/OrderContext.jsx";

export function AppShell({ step, children }) {
  const { ticketsRemaining } = useOrder();

  return (
    <div className="app-shell">
      <div className="flow-status" role="region" aria-label="進行状況">
        <div className="flow-status__inner">
          <StepProgress step={step} />
        </div>
      </div>
      <div className="container">
        <header className="app-top">
          <div className="app-top__brand">
            <Link to="/store" className="app-top__logo">
              コンビニ
            </Link>
            <span className="app-top__sub">サブスク献立（デモ）</span>
          </div>
          <div className="ticket-pill" title="サブスクの引換チケット">
            <span className="ticket-pill__icon">🎫</span>
            <span>残り {ticketsRemaining} 枚</span>
          </div>
        </header>
        {children}

        <p className="footer-note">本サービスはデモです。医療・栄養の個別アドバイスではありません。</p>
      </div>
    </div>
  );
}
