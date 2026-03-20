import React from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell.jsx";
import { StoreMap } from "../components/StoreMap.jsx";
import { SEVEN_STORES, useOrder } from "../context/OrderContext.jsx";

export function StoreSelect() {
  const navigate = useNavigate();
  const { store, setStore } = useOrder();

  return (
    <AppShell step={1}>
      <section className="card page-section">
        <h1 className="hero-title" style={{ marginTop: 0 }}>
          店舗を選ぶ
        </h1>
        <p className="hero-desc">地図上のマーカーをタップして、在庫がありそうな場所を探す起点となるコンビニを選んでください。</p>

        <div className="map-frame map-frame--leaflet" role="application" aria-label="店舗地図">
          <StoreMap
            stores={SEVEN_STORES}
            selectedId={store?.id ?? null}
            onSelectStore={setStore}
            onConfirmStore={(s) => {
              setStore(s);
              navigate("/mood");
            }}
          />
        </div>

        {store ? (
          <p className="store-picked">
            選択中：<strong>{store.name}</strong>
          </p>
        ) : (
          <p className="muted" style={{ marginTop: 12 }}>
            マーカーまたはポップアップの「この店舗を選ぶ」で次に進みます。
          </p>
        )}
      </section>
    </AppShell>
  );
}
