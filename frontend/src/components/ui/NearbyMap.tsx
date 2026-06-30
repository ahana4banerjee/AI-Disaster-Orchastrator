"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Import Leaflet styling rules to ensure grids align correctly
import "leaflet/dist/leaflet.css";

// Configure default icon assets using unpkg CDN resources to resolve Next.js asset compilation issues
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface NearbyMapProps {
  latitude: number;
  longitude: number;
  radiusKm: number;
  onCoordinatesChange: (lat: number, lon: number) => void;
}

// Map events controller to capture clicks on Leaflet canvas map
function MapEventsController({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      const lat = Math.round(e.latlng.lat * 100) / 100;
      const lon = Math.round(e.latlng.lng * 100) / 100;
      
      // Keep within valid lat/long boundary ranges
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        onMapClick(lat, lon);
      }
    },
  });
  return null;
}

// Controller to auto-center Leaflet map coordinates on parent text input updates
function MapViewController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function NearbyMap({ latitude, longitude, radiusKm, onCoordinatesChange }: NearbyMapProps) {
  const center: [number, number] = [latitude, longitude];

  return (
    <div className="h-full w-full relative z-10" style={{ minHeight: "280px" }}>
      <MapContainer
        center={center}
        zoom={4}
        scrollWheelZoom={true}
        className="h-full w-full rounded-lg"
        style={{ height: "100%", width: "100%" }}
      >
        {/* OpenStreetMap public map tile layers */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Dynamic target marker indicating currently selected coordinates */}
        <Marker position={center}>
          <Circle
            center={center}
            radius={radiusKm * 1000} // Circle radius takes values in meters
            pathOptions={{
              fillColor: "var(--color-accent-primary)",
              fillOpacity: 0.1,
              color: "var(--color-accent-primary)",
              weight: 1.5,
              dashArray: "4, 4"
            }}
          />
        </Marker>

        {/* Dynamic map view & click event controllers */}
        <MapViewController center={center} />
        <MapEventsController onMapClick={onCoordinatesChange} />
      </MapContainer>
    </div>
  );
}
