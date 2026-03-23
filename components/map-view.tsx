"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { areSiteMapBoundsEqual, getPrimarySiteImage, getSiteMapMarkerState, getSiteMarkerTone } from "@/lib/sites";
import type { ExplorationRoute, Site, SiteMapBounds, SiteMapMarkerState } from "@/types/site";

const DEFAULT_CENTER: [number, number] = [35.8617, 104.1954];
const DEFAULT_ZOOM = 4;
const FOCUSED_SITE_ZOOM = 12;
const MEDIUM_LABEL_ZOOM = 9;
const HIGH_LABEL_ZOOM = 11;

type BasemapMode = "minimal" | "standard";

const BASEMAPS: Record<BasemapMode, { label: string; url: string; subdomains: string[] }> = {
  minimal: {
    label: "无标注底图",
    url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    subdomains: ["a", "b", "c", "d"],
  },
  standard: {
    label: "浅色标注",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    subdomains: ["a", "b", "c", "d"],
  },
};

function createMarkerIcon(site: Site, markerState: SiteMapMarkerState) {
  const tone = getSiteMarkerTone(site);
  const classes = [
    "site-marker",
    `site-marker--${markerState.relationLevel}`,
    markerState.isHovered ? "site-marker--hovered" : "",
    markerState.isSelected ? "site-marker--selected" : "",
    markerState.isInRoute ? "site-marker--in-route" : "",
    markerState.isRouteStart ? "site-marker--route-start" : "",
    markerState.isRouteEnd ? "site-marker--route-end" : "",
    markerState.isDimmedByRoute ? "site-marker--route-dimmed" : "",
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

function focusMapOnResults(map: L.Map, sites: Site[]) {
  if (sites.length === 0) {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    return;
  }

  if (sites.length === 1) {
    map.setView([sites[0].lat, sites[0].lng], FOCUSED_SITE_ZOOM);
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
}

function getBoundsSnapshot(map: L.Map): SiteMapBounds {
  const bounds = map.getBounds();

  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest(),
  };
}

function MapUpdater({ sites }: { sites: Site[] }) {
  const map = useMap();

  useEffect(() => {
    focusMapOnResults(map, sites);
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

function MapControls() {
  const map = useMap();

  useEffect(() => {
    const scale = L.control.scale({ position: "bottomleft", imperial: false, maxWidth: 120 });
    const zoom = L.control.zoom({ position: "bottomright" });

    scale.addTo(map);
    zoom.addTo(map);

    return () => {
      scale.remove();
      zoom.remove();
    };
  }, [map]);

  return null;
}

function ZoomWatcher({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();

  useEffect(() => {
    const syncZoom = () => onZoomChange(map.getZoom());

    syncZoom();
    map.on("zoomend", syncZoom);

    return () => {
      map.off("zoomend", syncZoom);
    };
  }, [map, onZoomChange]);

  return null;
}

function BoundsWatcher({
  onBoundsChange,
  syncSignal,
}: {
  onBoundsChange?: (bounds: SiteMapBounds | null) => void;
  syncSignal?: number;
}) {
  const map = useMap();
  const latestBoundsRef = useRef<SiteMapBounds | null>(null);
  const latestSyncSignalRef = useRef(syncSignal ?? 0);

  useEffect(() => {
    if (!onBoundsChange) {
      return;
    }

    const syncBounds = () => {
      const nextBounds = getBoundsSnapshot(map);
      if (areSiteMapBoundsEqual(latestBoundsRef.current, nextBounds)) {
        return;
      }

      latestBoundsRef.current = nextBounds;
      onBoundsChange(nextBounds);
    };

    syncBounds();
    map.on("moveend", syncBounds);
    map.on("zoomend", syncBounds);

    return () => {
      map.off("moveend", syncBounds);
      map.off("zoomend", syncBounds);
    };
  }, [map, onBoundsChange]);

  useEffect(() => {
    if (!onBoundsChange) {
      return;
    }

    const nextSyncSignal = syncSignal ?? 0;
    if (nextSyncSignal === latestSyncSignalRef.current) {
      return;
    }

    latestSyncSignalRef.current = nextSyncSignal;
    const nextBounds = getBoundsSnapshot(map);
    latestBoundsRef.current = nextBounds;
    onBoundsChange(nextBounds);
  }, [map, onBoundsChange, syncSignal]);

  return null;
}

function MapCommandWatcher({
  sites,
  resetSignal,
  fitResultsSignal,
}: {
  sites: Site[];
  resetSignal?: number;
  fitResultsSignal?: number;
}) {
  const map = useMap();
  const latestResetSignal = useRef(resetSignal ?? 0);
  const latestFitSignal = useRef(fitResultsSignal ?? 0);

  useEffect(() => {
    const nextResetSignal = resetSignal ?? 0;
    if (nextResetSignal === latestResetSignal.current) {
      return;
    }

    latestResetSignal.current = nextResetSignal;
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  }, [map, resetSignal]);

  useEffect(() => {
    const nextFitSignal = fitResultsSignal ?? 0;
    if (nextFitSignal === latestFitSignal.current) {
      return;
    }

    latestFitSignal.current = nextFitSignal;
    focusMapOnResults(map, sites);
  }, [fitResultsSignal, map, sites]);

  return null;
}

export default function MapView({
  sites,
  selectedSiteId,
  hoveredSiteId,
  activeRoute,
  onSelectSite,
  onHoverSite,
  onBoundsChange,
  boundsSyncSignal,
  resetSignal,
  fitResultsSignal,
  quickCategories,
  activeCategory,
  onApplyCategory,
}: {
  sites: Site[];
  selectedSiteId: string | null;
  hoveredSiteId: string | null;
  activeRoute: ExplorationRoute | null;
  onSelectSite: (siteId: string | null) => void;
  onHoverSite: (siteId: string | null) => void;
  onBoundsChange?: (bounds: SiteMapBounds | null) => void;
  boundsSyncSignal?: number;
  resetSignal?: number;
  fitResultsSignal?: number;
  quickCategories: readonly string[];
  activeCategory: string;
  onApplyCategory: (category: string) => void;
}) {
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const [basemapMode, setBasemapMode] = useState<BasemapMode>("minimal");
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) ?? null,
    [selectedSiteId, sites],
  );
  const hoveredSite = useMemo(
    () => sites.find((site) => site.id === hoveredSiteId) ?? null,
    [hoveredSiteId, sites],
  );
  const relationshipSite = hoveredSite ?? selectedSite;
  const routeSiteIds = useMemo(() => new Set(activeRoute?.siteIds ?? []), [activeRoute]);
  const routeStartSiteId = activeRoute?.stops[0]?.site.id ?? null;
  const routeEndSiteId = activeRoute?.stops[activeRoute.stops.length - 1]?.site.id ?? null;

  useEffect(() => {
    if (!selectedSiteId) {
      return;
    }

    markerRefs.current[selectedSiteId]?.openPopup();
  }, [selectedSiteId]);

  return (
    <div className="site-map-shell">
      <div className="site-map-toolbar">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Basemap</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{BASEMAPS[basemapMode].label}</p>
        </div>
        <div className="site-map-toggle" role="tablist" aria-label="切换地图底图">
          {(Object.entries(BASEMAPS) as [BasemapMode, (typeof BASEMAPS)[BasemapMode]][]).map(
            ([mode, config]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setBasemapMode(mode)}
                className={mode === basemapMode ? "is-active" : ""}
              >
                {config.label}
              </button>
            ),
          )}
        </div>
      </div>

      {quickCategories.length > 0 ? (
        <div className="site-map-quick-filters" aria-label="快速类型筛选">
          {quickCategories.map((category) => {
            const isActive = activeCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => onApplyCategory(isActive ? "" : category)}
                className={`site-map-quick-filter ${isActive ? "is-active" : ""}`}
              >
                {category}
              </button>
            );
          })}
        </div>
      ) : null}

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
        zoomControl={false}
        className="h-full w-full"
      >
        <MapUpdater sites={sites} />
        <SelectedSiteUpdater selectedSite={selectedSite} />
        <MapControls />
        <ZoomWatcher onZoomChange={setZoom} />
        <BoundsWatcher onBoundsChange={onBoundsChange} syncSignal={boundsSyncSignal} />
        <MapCommandWatcher
          sites={sites}
          resetSignal={resetSignal}
          fitResultsSignal={fitResultsSignal}
        />

        <TileLayer
          attribution='&copy; <a href="https://www.amap.com/">高德地图</a>'
          url={BASEMAPS[basemapMode].url}
          subdomains={BASEMAPS[basemapMode].subdomains}
        />

        {activeRoute ? <Polyline positions={activeRoute.coordinates} pathOptions={{ className: "site-route-line" }} /> : null}

        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          iconCreateFunction={createClusterIcon}
        >
          {sites.map((site) => {
            const image = getPrimarySiteImage(site);
            const markerState = getSiteMapMarkerState(relationshipSite, site, {
              selectedSiteId,
              hoveredSiteId,
              routeSiteIds,
              routeStartSiteId,
              routeEndSiteId,
            });
            const { isSelected, isHovered, relationLevel } = markerState;
            const showPermanentLabel =
              zoom >= HIGH_LABEL_ZOOM ||
              (zoom >= MEDIUM_LABEL_ZOOM &&
                (isSelected || isHovered || relationLevel === "same-city" || relationLevel === "same-province"));
            const showHoverLabel = zoom < HIGH_LABEL_ZOOM && (isHovered || isSelected || relationLevel === "same-category");

            return (
              <Marker
                key={site.id}
                position={[site.lat, site.lng]}
                icon={createMarkerIcon(site, markerState)}
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
                {showPermanentLabel ? (
                  <Tooltip
                    permanent
                    direction="top"
                    offset={[0, -14]}
                    className={`site-label-tooltip ${relationLevel !== "default" ? `site-label-tooltip--${relationLevel}` : ""}`}
                  >
                    <div className="site-label-tooltip__title">{site.name}</div>
                  </Tooltip>
                ) : null}

                {showHoverLabel ? (
                  <Tooltip
                    direction="top"
                    offset={[0, -14]}
                    opacity={1}
                    className={`site-hover-tooltip ${relationLevel !== "default" ? `site-hover-tooltip--${relationLevel}` : ""}`}
                  >
                    <div className="site-label-tooltip__title">{site.name}</div>
                    <div className="site-label-tooltip__meta">{site.category}</div>
                  </Tooltip>
                ) : null}

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
