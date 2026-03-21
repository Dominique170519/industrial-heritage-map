"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { getPrimarySiteImage, getSiteMarkerTone } from "@/lib/sites";
import type { Site } from "@/types/site";

const DEFAULT_CENTER: [number, number] = [35.8617, 104.1954];
const DEFAULT_ZOOM = 4;
const FOCUSED_SITE_ZOOM = 12;

function createMarkerIcon(site: Site, options: { isSelected: boolean; isHovered: boolean }) {
  const tone = getSiteMarkerTone(site);
  const classes = [
    "site-marker",
    options.isHovered ? "site-marker--hovered" : "",
    options.isSelected ? "site-marker--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return L.divIcon({
    className: "site-marker-icon",
    html: `<div class="${classes}" style="--marker-fill:${tone.fill};--marker-stroke:${tone.stroke};--marker-ring:${tone.ring};--marker-shadow:${tone.shadow};"><span class="site-marker__core"></span></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
  });
}

function createClusterIcon(cluster: { getChildCount: () => number }) {
  return L.divIcon({
    html: `<div class="site-cluster"><span class="site-cluster__count">${cluster.getChildCount()}</span></div>`,
    className: "site-cluster-icon",
    iconSize: [48, 48],
  });
}

function focusMapOnSite(map: L.Map, site: Site) {
  const zoom = Math.max(map.getZoom(), FOCUSED_SITE_ZOOM);
  map.flyTo([site.lat, site.lng], zoom, {
    animate: true,
    duration: 0.45,
  });

  map.panBy([160, 0], {
    animate: true,
    duration: 0.3,
  });
}

function MapUpdater({ sites }: { sites: Site[] }) {
  const map = useMap();

  useEffect(() => {
    if (sites.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    if (sites.length === 1) {
      map.setView([sites[0].lat, sites[0].lng], 12);
      map.panBy([140, 0]);
      return;
    }

    const bounds = L.latLngBounds(
      sites.map((site) => [site.lat, site.lng] as [number, number]),
    );

    map.fitBounds(bounds, {
      padding: [48, 48],
      maxZoom: sites.length <= 3 ? 8 : 7,
    });
  }, [map, sites]);

  return null;
}

function SelectedSiteUpdater({
  selectedSite,
}: {
  selectedSite: Site | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedSite) {
      return;
    }

    focusMapOnSite(map, selectedSite);
  }, [map, selectedSite]);

  return null;
}

export default function MapView({
  sites,
  selectedSiteId,
  hoveredSiteId,
  onSelectSite,
  onHoverSite,
}: {
  sites: Site[];
  selectedSiteId: string | null;
  hoveredSiteId: string | null;
  onSelectSite: (siteId: string | null) => void;
  onHoverSite: (siteId: string | null) => void;
}) {
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) ?? null,
    [selectedSiteId, sites],
  );

  useEffect(() => {
    if (!selectedSiteId) {
      return;
    }

    markerRefs.current[selectedSiteId]?.openPopup();
  }, [selectedSiteId]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      {sites.length === 0 ? (
        <div className="site-empty-state">
          <p className="text-sm font-medium text-slate-700">当前筛选条件下没有匹配点位</p>
          <p className="mt-1 text-xs text-slate-500">地图已保持全国视角，可调整筛选条件后继续浏览。</p>
        </div>
      ) : null}

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-[560px] w-full"
      >
        <MapUpdater sites={sites} />
        <SelectedSiteUpdater selectedSite={selectedSite} />

        <TileLayer
          attribution='&copy; <a href="https://www.amap.com/">高德地图</a>'
          url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
          subdomains={["1", "2", "3", "4"]}
        />

        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          iconCreateFunction={createClusterIcon}
        >
          {sites.map((site) => {
            const image = getPrimarySiteImage(site);
            const isSelected = selectedSiteId === site.id;
            const isHovered = hoveredSiteId === site.id;

            return (
              <Marker
                key={site.id}
                position={[site.lat, site.lng]}
                icon={createMarkerIcon(site, { isSelected, isHovered })}
                ref={(marker) => {
                  markerRefs.current[site.id] = marker;
                }}
                eventHandlers={{
                  click: () => onSelectSite(site.id),
                  mouseover: () => onHoverSite(site.id),
                  mouseout: () => onHoverSite(null),
                  popupopen: () => onSelectSite(site.id),
                }}
              >
                <Popup>
                  <div className="w-[220px]">
                    <div className="mb-2 overflow-hidden rounded-lg border border-stone-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
                    <p className="mt-2 text-xs font-medium tracking-[0.08em] text-slate-500 uppercase">
                      {site.status}
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
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
