"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "./leaflet-global"; // must come before the plugin
import "leaflet.markercluster";

import L from "leaflet";
import { useEffect } from "react";
import { Circle, MapContainer, TileLayer, useMap } from "react-leaflet";

import type { LatLng } from "@/lib/geo";

export type ClusterPin = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  photo: string;
};

export type ClusterMapProps = {
  center: LatLng;
  radiusKm: number;
  pins: ClusterPin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const zoomFor = (km: number) => (km <= 1 ? 15 : km <= 3 ? 14 : km <= 5 ? 13 : km <= 10 ? 12 : 11);

export default function ClusterMap({
  center,
  radiusKm,
  pins,
  selectedId,
  onSelect,
}: ClusterMapProps) {
  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={zoomFor(radiusKm)}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* The search area */}
      <Circle
        center={[center.latitude, center.longitude]}
        radius={radiusKm * 1000}
        pathOptions={{ color: "#ff5b22", weight: 1.5, dashArray: "6 7", fillOpacity: 0.04 }}
      />
      <ClusterLayer pins={pins} selectedId={selectedId} onSelect={onSelect} />
    </MapContainer>
  );
}

/** Plain Leaflet plugin (markercluster) wired into react-leaflet via useMap + an effect. */
function ClusterLayer({
  pins,
  selectedId,
  onSelect,
}: Pick<ClusterMapProps, "pins" | "selectedId" | "onSelect">) {
  const map = useMap();
  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 48,
      iconCreateFunction: (cluster) =>
        L.divIcon({
          className: "",
          iconSize: [46, 46],
          html: `<span class="gathr-cluster">${cluster.getChildCount()}</span>`,
        }),
    });
    for (const pin of pins) {
      const selected = pin.id === selectedId;
      const size = selected ? 58 : 44;
      const marker = L.marker([pin.latitude, pin.longitude], {
        title: pin.title, // set as an attribute by Leaflet (escaped), also gives an accessible name
        keyboard: true,
        zIndexOffset: selected ? 1000 : 0,
        icon: L.divIcon({
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          html: `<span class="gathr-pin${selected ? " is-selected" : ""}"><img src="${encodeURI(pin.photo)}" alt="" /></span>`,
        }),
      });
      marker.on("click", () => onSelect(pin.id));
      group.addLayer(marker);
    }
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
    };
  }, [map, pins, selectedId, onSelect]);
  return null;
}
