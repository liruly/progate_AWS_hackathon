import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

/** コンビニ店舗（デモ・東京周辺の座標） */
export const SEVEN_STORES = [
  { id: "shibuya", name: "渋谷センター街店", lat: 35.6598, lng: 139.6982 },
  { id: "shinjuku", name: "新宿南口店", lat: 35.6895, lng: 139.7006 },
  { id: "ikebukuro", name: "池袋東口店", lat: 35.7296, lng: 139.7109 },
  { id: "tokyo", name: "東京駅八重洲口店", lat: 35.6812, lng: 139.7671 },
];

const OrderContext = createContext(null);

export function OrderProvider({ children }) {
  const [store, setStore] = useState(null);
  const [moodTag, setMoodTag] = useState("refreshing");
  const [moodNote, setMoodNote] = useState("");
  const [calorieTier, setCalorieTier] = useState(null);
  const [meal, setMeal] = useState(null);
  const [coupon, setCoupon] = useState(null);
  /** サブスクチケット残り（デモ） */
  const [ticketsRemaining, setTicketsRemaining] = useState(3);

  /** 画面1からやり直し（チケット枚数は維持） */
  const resetFlow = useCallback(() => {
    setStore(null);
    setMoodTag("refreshing");
    setMoodNote("");
    setCalorieTier(null);
    setMeal(null);
    setCoupon(null);
  }, []);

  const consumeTicket = useCallback(() => {
    setTicketsRemaining((n) => Math.max(0, n - 1));
  }, []);

  const value = useMemo(
    () => ({
      store,
      setStore,
      moodTag,
      setMoodTag,
      moodNote,
      setMoodNote,
      calorieTier,
      setCalorieTier,
      meal,
      setMeal,
      coupon,
      setCoupon,
      ticketsRemaining,
      consumeTicket,
      resetFlow,
    }),
    [
      store,
      moodTag,
      moodNote,
      calorieTier,
      meal,
      coupon,
      ticketsRemaining,
      consumeTicket,
      resetFlow,
    ],
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be used within OrderProvider");
  return ctx;
}
