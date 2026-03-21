"use client";

import dynamic from "next/dynamic";

const SiteLocationMap = dynamic(() => import("@/components/site-location-map"), {
  ssr: false,
  loading: () => <div className="h-[280px] w-full bg-stone-100" />,
});

export default function SiteLocationMapClient({
  lat,
  lng,
  name,
}: {
  lat: number;
  lng: number;
  name: string;
}) {
  return <SiteLocationMap lat={lat} lng={lng} name={name} />;
}
