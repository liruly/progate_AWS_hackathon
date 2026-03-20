import React from "react";

const LABELS = ["店舗", "気分 1/2", "気分 2/2", "メニュー", "引換"];

export function StepProgress({ step }) {
  return (
    <nav className="step-progress" aria-label="進行状況">
      {LABELS.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className={`step-progress__item ${active ? "active" : ""} ${done ? "done" : ""}`}>
            <span className="step-progress__num">{done ? "✓" : n}</span>
            <span className="step-progress__label">{label}</span>
          </div>
        );
      })}
    </nav>
  );
}
