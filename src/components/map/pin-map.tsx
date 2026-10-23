"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

import { APPROX_RADIUS_M, type LatLng } from "@/lib/geo";

export type PinMapProps = {
  center: LatLng;
  /** "pin" = exact marker; "approx" = a rough circle (public view of a private venue). */
  mode: "pin" | "approx";
  /** Host form: drag the pin or tap the map to move it. */
  onMove?: (point: LatLng) => void;
  zoom?: number;
  className?: string;
};

// A CSS/SVG pin instead of Leaflet's default PNG icons (those break with bundlers).
const pinIcon = L.divIcon({
  className: "",
  iconSize: [36, 44],
  iconAnchor: [18, 44],
  html: `<svg width="36" height="44" viewBox="0 0 24 30" aria-hidden="true"><path d="M12 29s-10-9-10-16a10 10 0 0 1 20 0c0 7-10 16-10 16z" fill="#ff5b22" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="#fff"/></svg>`,
});

export default function PinMap({ center, mode, onMove, zoom = 15, className }: PinMapProps) {
  const position = useMemo<[number, number]>(() => [center.latitude, center.longitude], [center]);
  return (
    <MapContainer
      center={position}
      zoom={zoom}
      scrollWheelZoom={false}
      className={className}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter position={position} />
      {mode === "approx" ? (
        <Circle
          center={position}
          radius={APPROX_RADIUS_M}
          pathOptions={{
            color: "#ff5b22",
            weight: 2,
            dashArray: "6 6",
            fillColor: "#ff5b22",
            fillOpacity: 0.12,
          }}
        />
      ) : (
        <Marker
          position={position}
          icon={pinIcon}
          draggable={Boolean(onMove)}
          eventHandlers={
            onMove
              ? {
                  dragend: (e) => {
                    const { lat, lng } = (e.target as L.Marker).getLatLng();
                    onMove({ latitude: lat, longitude: lng });
                  },
                }
              : undefined
          }
        />
      )}
      {onMove ? <TapToMove onMove={onMove} /> : null}
    </MapContainer>
  );
}

/** Keep the map centred when the position changes from outside (e.g. a search result). */
function Recenter({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: true });
  }, [map, position]);
  return null;
}

function TapToMove({ onMove }: { onMove: (point: LatLng) => void }) {
  useMapEvents({ click: (e) => onMove({ latitude: e.latlng.lat, longitude: e.latlng.lng }) });
  return null;
}
