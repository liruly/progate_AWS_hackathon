import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell.jsx";
import { useOrder } from "../context/OrderContext.jsx";
import { guessMoodFromText } from "../lib/mood.js";

const MOODS = [
  { id: "sweet", label: "甘い" },
  { id: "spicy", label: "辛い" },
  { id: "sour", label: "酸っぱい" },
  { id: "refreshing", label: "さっぱり" },
];

function Chip({ selected, onSelect, children, className }) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={`pill ${className || ""} ${selected ? "selected" : ""}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {children}
    </div>
  );
}

export function MoodSelect() {
  const navigate = useNavigate();
  const { store, moodTag, setMoodTag, moodNote, setMoodNote } = useOrder();

  if (!store) {
    return <Navigate to="/store" replace />;
  }

  function applyGuessFromNote() {
    const g = guessMoodFromText(moodNote);
    if (g) setMoodTag(g);
  }

  function onNext() {
    applyGuessFromNote();
    navigate("/calories");
  }

  return (
    <AppShell step={2}>
      <section className="card page-section">
        <h1 className="hero-title" style={{ marginTop: 0 }}>
          今日の気分は？
        </h1>
        <p className="hero-desc">味わいやキーワードで、いまの気分に近いものを選んでください。</p>

        <span className="section-label">タップで選択</span>
        <div className="chip-grid" style={{ marginBottom: 20 }}>
          {MOODS.map((m) => (
            <Chip
              key={m.id}
              selected={m.id === moodTag}
              onSelect={() => setMoodTag(m.id)}
              className={`mood-${m.id}`}
            >
              {m.label}
            </Chip>
          ))}
        </div>

        <span className="section-label">自由記述（任意）</span>
        <textarea
          className="mood-textarea"
          rows={3}
          placeholder="例：甘いものが食べたい、仕事疲れた、カラオケオールしたい…"
          value={moodNote}
          onChange={(e) => setMoodNote(e.target.value)}
          onBlur={applyGuessFromNote}
        />
        <p className="hint">※キーワードから気分を推測して、次の画面で反映します（簡易マッチ）。</p>

        <div className="actions-row">
          <button type="button" onClick={() => navigate(-1)}>
            戻る
          </button>
          <button type="button" className="primary" onClick={onNext}>
            進む（気分 2/2）
          </button>
        </div>
      </section>
    </AppShell>
  );
}
