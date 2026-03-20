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
import { getPrimarySiteImage } from "@/lib/sites";
import type { Site } from "@/types/site";

// 红色三角形图标
const redTriangleIcon = L.divIcon({
  className: "custom-marker",
  html: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L22 20H2L12 2Z" fill="#ef4444" stroke="#dc2626" stroke-width="2"/>
  </svg>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

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
          attribution='&copy; <a href="https://www.amap.com/">高德地图</a>'
          url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
          subdomains={["1", "2", "3", "4"]}
        />

        {sites.map((site) => {
          const image = getPrimarySiteImage(site);

          return (
            <Marker key={site.id} position={[site.lat, site.lng]} icon={redTriangleIcon}>
              <Popup>
                <div className="w-[220px]">
                  <div className="mb-2 overflow-hidden rounded-lg border border-stone-200">
                    <img
                      src={image.url}
                      alt={image.alt ?? site.name}
                      className="h-28 w-full object-cover"
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{site.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {site.provinceFull} · {site.primaryCity}
                    {site.district ? ` · ${site.district}` : ""}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{site.description}</p>
                  <Link
                    href={`/sites/${site.id}`}
                    className="mt-3 inline-flex text-sm font-medium text-slate-900 underline underline-offset-4"
                  >
                    查看详情
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
