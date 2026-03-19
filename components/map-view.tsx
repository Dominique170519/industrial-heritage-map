"use client";

import { useEffect } from "react";
import Link from "next/link";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { Site } from "@/types/site";

function MapUpdater({ sites }: { sites: Site[] }) {
  const map = useMap();

  useEffect(() => {
    if (sites.length === 0) {
      map.setView([35.8617, 104.1954], 4);
      return;
    }

    if (sites.length === 1) {
      map.setView([sites[0].lat, sites[0].lng], 13);
      return;
    }

    const bounds = L.latLngBounds(
      sites.map((site) => [site.lat, site.lng] as [number, number]),
    );

    map.fitBounds(bounds, {
      padding: [40, 40],
    });
  }, [map, sites]);

  return null;
}

export default function MapView({ sites }: { sites: Site[] }) {
  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x.src,
      iconUrl: markerIcon.src,
      shadowUrl: markerShadow.src,
    });
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <MapContainer
        center={[35.8617, 104.1954]}
        zoom={4}
        scrollWheelZoom
        className="h-[560px] w-full"
      >
        <MapUpdater sites={sites} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {sites.map((site) => (
          <Marker key={site.id} position={[site.lat, site.lng]}>
            <Popup>
              <div className="w-[220px]">
                <div className="mb-2 overflow-hidden rounded-lg border border-stone-200">
                  <img
                    src={site.coverImage}
                    alt={site.name}
                    className="h-28 w-full object-cover"
                  />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {site.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {site.city} · {site.district}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {site.summary}
                </p>
                <Link
                  href={`/sites/${site.id}`}
                  className="mt-3 inline-flex text-sm font-medium text-slate-900 underline underline-offset-4"
                >
                  查看详情
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
