"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface RiskHotspot {
  place: string;
  subregion: string;
  latitude: number;
  longitude: number;
  predictedDisasterType: string;
  predictedMagnitude: number | null;
  eventCount: number;
  riskLevel: "Low" | "Medium" | "High";
  clusterId: number;
}

interface RiskHotspotsMapProps {
  hotspots: RiskHotspot[];
  selectedPlace: RiskHotspot | null;
  onSelectPlace: (spot: RiskHotspot) => void;
}

function getRiskColor(level: string): string {
  if (level === "High") return "#DC2626";
  if (level === "Medium") return "#F59E0B";
  return "#10B981";
}

function MapFocusController({ selected }: { selected: RiskHotspot | null }) {
  const map = useMap();
  useEffect(() => {
    if (selected) {
      map.setView([selected.latitude, selected.longitude], Math.max(map.getZoom(), 4), {
        animate: true,
      });
    }
  }, [selected, map]);
  return null;
}

export default function RiskHotspotsMap({
  hotspots,
  selectedPlace,
  onSelectPlace,
}: RiskHotspotsMapProps) {
  return (
    <div className="h-full w-full relative z-10" style={{ minHeight: "430px" }}>
      <MapContainer
        center={[20.0, 10.0]}
        zoom={2}
        scrollWheelZoom={true}
        className="h-full w-full rounded-xl"
        style={{ height: "100%", width: "100%", minHeight: "430px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapFocusController selected={selectedPlace} />

        {hotspots.map((spot) => {
          const color = getRiskColor(spot.riskLevel);
          const isSelected = selectedPlace?.place === spot.place;
          const radius =
            spot.riskLevel === "High"
              ? isSelected ? 13 : 9
              : spot.riskLevel === "Medium"
              ? isSelected ? 11 : 7.5
              : isSelected ? 10 : 6;

          return (
            <CircleMarker
              key={`${spot.place}-${spot.subregion}`}
              center={[spot.latitude, spot.longitude]}
              radius={radius}
              fillColor={color}
              fillOpacity={isSelected ? 0.95 : 0.72}
              color={isSelected ? "#FFFFFF" : color}
              weight={isSelected ? 2.5 : 1.5}
              eventHandlers={{
                click: () => onSelectPlace(spot),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.96}>
                <div className="font-sans text-xs space-y-0.5 min-w-[160px]">
                  <div className="font-bold text-slate-900">
                    {spot.place} <span className="text-slate-500 font-normal">({spot.subregion})</span>
                  </div>
                  <div className="text-[11px] text-slate-700">
                    <b>Predicted Disaster:</b> {spot.predictedDisasterType}
                  </div>
                  <div className="text-[11px] text-slate-700">
                    <b>Magnitude:</b> {spot.predictedMagnitude !== null ? spot.predictedMagnitude : "N/A"}
                  </div>
                  <div className="text-[11px] font-semibold" style={{ color }}>
                    Risk Level: {spot.riskLevel} ({spot.eventCount} events)
                  </div>
                </div>
              </Tooltip>

              <Popup>
                <div className="font-sans text-xs space-y-1 text-slate-900">
                  <div className="font-bold text-sm">{spot.place}</div>
                  <div className="text-[11px] text-slate-600">{spot.subregion}</div>
                  <div><b>Predicted Disaster:</b> {spot.predictedDisasterType}</div>
                  <div><b>Magnitude:</b> {spot.predictedMagnitude !== null ? spot.predictedMagnitude : "N/A"}</div>
                  <div><b>Risk Level:</b> {spot.riskLevel}</div>
                  <div><b>Historical Events:</b> {spot.eventCount}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
