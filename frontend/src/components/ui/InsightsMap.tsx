"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";

// Import Leaflet styles
import "leaflet/dist/leaflet.css";

interface RegionalCluster {
  subregion: string;
  frequency: number;
  mortalityRate: number;
  economicRisk: number;
  maxMagnitude: number;
  clusterId: number;
  riskTier: string;
  updatedAt: string;
}

interface InsightsMapProps {
  clusters: RegionalCluster[];
  selectedCluster: RegionalCluster | null;
  onClusterSelect: (cluster: RegionalCluster) => void;
}

// Subregion geographic coordinate centroid mapping (covers all DB entries)
const SUBREGION_COORDINATES: Record<string, [number, number]> = {
  "latin america and the caribbean": [-15.0, -60.0],
  "western asia": [30.0, 45.0],
  "northern america": [45.0, -100.0],
  "eastern asia": [35.0, 105.0],
  "central asia": [45.0, 65.0],
  "sub-saharan africa": [-10.0, 22.0],
  "south-eastern asia": [5.0, 115.0],
  "southern asia": [23.0, 78.0],
  "southern europe": [40.0, 15.0],
  "micronesia": [7.0, 150.0],
  "eastern europe": [50.0, 30.0],
  "western europe": [47.0, 2.0],
  "northern europe": [62.0, 15.0],
  "australia and new zealand": [-25.0, 135.0],
  "northern africa": [26.0, 17.0],
  "melanesia": [-8.0, 145.0],
  "polynesia": [-18.0, -140.0],
};

const getTierColor = (tier: string) => {
  const norm = (tier || "").toLowerCase().trim();
  if (norm === "low") return "var(--color-severity-low)";
  if (norm === "medium" || norm === "moderate") return "var(--color-severity-moderate)";
  if (norm === "high") return "var(--color-severity-high)";
  return "var(--color-severity-extreme)";
};

// Map view controller to center and highlight chosen subregion centroid
function MapViewController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function InsightsMap({ clusters, selectedCluster, onClusterSelect }: InsightsMapProps) {
  // Get active coordinate center to focus Leaflet viewport
  const getSelectedCenter = (): [number, number] => {
    if (selectedCluster) {
      const key = selectedCluster.subregion.toLowerCase().trim();
      if (SUBREGION_COORDINATES[key]) {
        return SUBREGION_COORDINATES[key];
      }
    }
    return [20.0, 0.0]; // Default global coordinate center
  };

  const activeCenter = getSelectedCenter();

  return (
    <div className="h-full w-full relative z-10" style={{ minHeight: "360px" }}>
      <MapContainer
        center={activeCenter}
        zoom={2}
        scrollWheelZoom={true}
        className="h-full w-full rounded-lg"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {clusters.map((c) => {
          const key = c.subregion.toLowerCase().trim();
          const coords = SUBREGION_COORDINATES[key];
          if (!coords) return null;

          const isSelected = selectedCluster?.subregion === c.subregion;
          const dotColor = getTierColor(c.riskTier);

          return (
            <CircleMarker
              key={c.subregion}
              center={coords}
              radius={isSelected ? 13 : 9}
              fillColor={dotColor}
              fillOpacity={isSelected ? 0.95 : 0.7}
              color={isSelected ? "#ffffff" : dotColor}
              weight={isSelected ? 2.5 : 1}
              eventHandlers={{
                click: () => onClusterSelect(c),
              }}
            >
              <Popup>
                <div className="font-sans text-xs uppercase font-bold text-gray-900 leading-tight">
                  <div className="border-b border-gray-100 pb-1 mb-1 text-gray-800">{c.subregion}</div>
                  <div className="text-[9px] text-gray-500 font-bold space-y-0.5">
                    <div>K-Means ID: <span className="font-mono text-gray-700">{c.clusterId}</span></div>
                    <div>Risk Tier: <span className="text-accent-primary">{c.riskTier}</span></div>
                    <div>Incidents: <span className="font-mono text-gray-700">{c.frequency.toFixed(1)}/yr</span></div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        <MapViewController center={activeCenter} />
      </MapContainer>
    </div>
  );
}
