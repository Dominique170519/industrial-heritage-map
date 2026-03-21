"use client";

import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

const detailMarker = L.divIcon({
  className: "site-detail-marker-icon",
  html: '<span class="site-detail-marker"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function SiteLocationMap({
  lat,
  lng,
  name,
}: {
  lat: number;
  lng: number;
  name: string;
}) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={13}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
      attributionControl={false}
      className="h-[280px] w-full"
    >
      <TileLayer url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}" subdomains={["1", "2", "3", "4"]} />
      <Marker position={[lat, lng]} icon={detailMarker} title={name} />
    </MapContainer>
  );
}
