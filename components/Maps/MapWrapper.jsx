// components/MapWrapper.js
"use client"
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-card text-muted-foreground">
      Loading Railway Map…
    </div>
  ),
});

export default function MapWrapper() {
  return <MapComponent />;
}