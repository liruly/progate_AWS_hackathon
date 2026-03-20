import L from "leaflet";
import "leaflet/dist/leaflet.css";
import React, { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

/** Vite バンドルでマーカー画像が壊れないようにする */
const defaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

function FitBounds({ stores }) {
  const map = useMap();
  const positions = useMemo(
    () => stores.filter((s) => s.lat != null && s.lng != null).map((s) => [s.lat, s.lng]),
    [stores],
  );

  useEffect(() => {
    if (positions.length === 0) return;
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, positions]);

  return null;
}

/**
 * @param {{
 *   stores: Array<{ id: string, name: string, lat: number, lng: number }>,
 *   selectedId: string | null,
 *   onSelectStore: (store: object) => void,
 *   onConfirmStore?: (store: object) => void,
 * }} props
 * onConfirmStore が渡された場合、ポップアップの「この店舗を選ぶ」ではこちらが呼ばれます（遷移など）
 */
export function StoreMap({ stores, selectedId, onSelectStore, onConfirmStore }) {
  const center = [35.68, 139.73];
  const zoom = 12;

  return (
    <MapContainer
      className="store-map leaflet-container"
      center={center}
      zoom={zoom}
      scrollWheelZoom
      style={{ height: 360, width: "100%", borderRadius: 16 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds stores={stores} />
      {stores.map((s) => (
        <Marker
          key={s.id}
          position={[s.lat, s.lng]}
          eventHandlers={{
            click: () => onSelectStore(s),
          }}
          opacity={selectedId === s.id ? 1 : 0.88}
        >
          <Popup>
            <strong>{s.name}</strong>
            <br />
            <button
              type="button"
              className="popup-select-btn"
              onClick={() => (onConfirmStore ?? onSelectStore)(s)}
            >
              この店舗を選ぶ
            </button>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
