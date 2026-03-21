import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { CalorieSelect } from "./pages/CalorieSelect.jsx";
import { MenuRecommend } from "./pages/MenuRecommend.jsx";
import { MoodSelect } from "./pages/MoodSelect.jsx";
import { Redeem } from "./pages/Redeem.jsx";
import { StoreSelect } from "./pages/StoreSelect.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/store" replace />} />
      <Route path="/store" element={<StoreSelect />} />
      <Route path="/mood" element={<MoodSelect />} />
      <Route path="/calories" element={<CalorieSelect />} />
      <Route path="/menu" element={<MenuRecommend />} />
      <Route path="/redeem" element={<Redeem />} />
      <Route path="*" element={<Navigate to="/store" replace />} />
    </Routes>
  );
}
