'use client'
import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Popup, Marker } from "react-leaflet"
import L from "leaflet"
import axios from "axios"

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

// Station Data
const stations = [
  { id: "RKMKP", name: "Rani Kamlapati Junction", position: [23.2218088, 77.4366091] },
  { id: "BPL", name: "Bhopal Junction", position: [23.2666891, 77.4106036] },
]

export default function MapComponent() {
  const [railLines, setRailLines] = useState([])

  useEffect(() => {
    const fetchRailways = async () => {
      try {
        // Overpass query: all railway ways in bounding box around Bhopal
        const query = `
        [out:json];
        area["name"="Madhya Pradesh"]["boundary"="administrative"];
        way["railway"="rail"](area);
        out geom;
        `
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
        const res = await axios.get(url)

        // Convert response to Leaflet polyline coordinates
        const lines = res.data.elements
          .filter(el => el.type === "way" && el.geometry)
          .map(el => el.geometry.map(g => [g.lat, g.lon]))

        setRailLines(lines)
      } catch (err) {
        console.error("Error fetching railway data:", err)
      }
    }

    fetchRailways()
  }, [])


  const stationIcon = L.icon({
    iconUrl: "/railwaystation.svg",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
    className: "station-icon",
  })

  return (
    <MapContainer center={[23.25, 77.42]} zoom={13} className="h-[1000px] w-full">
      {/* Background Map */}
      
      {/* <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      /> */}

      <TileLayer
        url="https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a>'
      />

      {/* Fetched Rail Lines */}
      {/* {railLines.map((line, idx) => (
        <Polyline key={idx} positions={line} pathOptions={{ color: "red", opacity: 0.5, weight: 2, dashArray: "10, 10" }} />
      ))} */}

      {/* Stations as markers with custom icon */}
      {stations.map(station => (
        <Marker key={station.id} position={station.position} icon={stationIcon}>
          <Popup>
            <b>{station.name}</b>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
