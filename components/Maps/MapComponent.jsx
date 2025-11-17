"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import axios from "axios"
// import { useSocket } from "@/hooks/use-socket" // Commented out since it might not be available

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false })
const Circle = dynamic(() => import("react-leaflet").then((mod) => mod.Circle), { ssr: false })

// Extended station data combining both datasets
const stations = [
  // Bhopal stations
  { id: "RKMKP", name: "Rani Kamlapati Junction", position: [23.2218088, 77.4366091], platforms: 8, type: "major" },
  { id: "BPL", name: "Bhopal Junction", position: [23.2666891, 77.4106036], platforms: 12, type: "major" },
  { id: "MISROD", name: "Rani Kamlapati Junction", position: [23.168700,77.458000], platforms: 8, type: "major" },
  { id: "BPL", name: "Bhopal Junction", position: [23.278565,77.419109], platforms: 12, type: "major" },
]

// Detailed track data with route waypoints
const trackData = {
  bhopalLine: [
    [23.2218088, 77.4366091], // Rani Kamlapati
    [23.168700,77.458000], // Misrod
    [23.278565,77.419109], // Nishantpura
    [23.340680,77.485886], // Sukhisewaniya
    [23.2666891, 77.4106036], // Bhopal Junction
    [26.786380,79.021912], // Itarsi Junction
  ],
}

// Route definitions for each train
const trainRoutes = {
  "T-401": { // Rajdhani Express
    path: "bhopalLine",
    direction: "forward", // forward or backward
    currentSegment: 2, // Current position on the route
    progress: 0.3 // Progress within current segment (0-1)
  },
  "T-205": { // Local Passenger
    path: "bhopalLine",
    direction: "forward",
    currentSegment: 6,
    progress: 0.7
  },
  "T-302": { // Goods Special
    path: "bhopalLine",
    direction: "forward",
    currentSegment: 1,
    progress: 0.5
  },
  "T-501": { // Shatabdi Express
    path: "bhopalLine",
    direction: "forward",
    currentSegment: 1,
    progress: 0.8
  },
}

// Enhanced train data with route information
const initialTrains = [
  {
    id: "T-401",
    name: "Rajdhani Express",
    number: "12001",
    type: "express",
    priority: "high",
    position: [28.625, 77.235], // Will be calculated from route
    speed: 85,
    heading: 45, // Will be calculated from route direction
    destination: "Terminal",
    origin: "New Delhi",
    nextStation: "Station A",
    eta: "14:45",
    delay: 2,
    status: "on-time",
    route: "NDL-J1-STA-J2-STB-TERM",
    coaches: 22,
    capacity: 1200,
  },
  {
    id: "T-205",
    name: "Local Passenger",
    number: "54371",
    type: "local",
    priority: "normal",
    position: [28.645, 77.262], // Will be calculated from route
    speed: 45,
    heading: 90, // Will be calculated from route direction
    destination: "Station B",
    origin: "Junction 1",
    nextStation: "Junction 2",
    eta: "14:38",
    delay: 0,
    status: "on-time",
    route: "J1-STA-J2-STB",
    coaches: 12,
    capacity: 800,
  },
  {
    id: "T-302",
    name: "Goods Special",
    number: "63214",
    type: "freight",
    priority: "low",
    position: [28.615, 77.237], // Will be calculated from route
    speed: 25,
    heading: 135, // Will be calculated from route direction
    destination: "Station C",
    origin: "Platform 3",
    nextStation: "Station C",
    eta: "15:12",
    delay: 8,
    status: "delayed",
    route: "P3-STC",
    coaches: 58,
    capacity: 0,
  },
  {
    id: "T-501",
    name: "Shatabdi Express",
    number: "12002",
    type: "express",
    priority: "high",
    position: [23.235, 77.430], // Will be calculated from route
    speed: 95,
    heading: 180, // Will be calculated from route direction
    destination: "Bhopal Junction",
    origin: "Rani Kamlapati",
    nextStation: "Bhopal Junction",
    eta: "16:30",
    delay: -3,
    status: "early",
    route: "RKMKP-BPL",
    coaches: 18,
    capacity: 1050,
  },
]

export default function EnhancedMapComponent() {
  const [trains, setTrains] = useState(initialTrains)
  const [selectedTrain, setSelectedTrain] = useState(null)
  const [railLines, setRailLines] = useState([])
  const [mapMode, setMapMode] = useState("standard") // "standard" or "railway"
  const [loading, setLoading] = useState(false)
  const [showRealRailways, setShowRealRailways] = useState(false)
  const mapRef = useRef(null)

  // Mock socket connection - replace with actual useSocket when available
  const isConnected = false
  // const { isConnected, on, off, emit } = useSocket("section-a1")

  // Fetch real railway data from OpenStreetMap
  useEffect(() => {
    const fetchRailways = async () => {
      if (!showRealRailways) return
      
      setLoading(true)
      try {
        // Overpass query for railway lines in Delhi area
        const query = `
        [out:json][timeout:25];
        (
          way["railway"="rail"](bbox:28.5,77.1,28.7,77.4);
          way["railway"="rail"](bbox:23.1,77.3,23.3,77.5);
        );
        out geom;
        `
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
        const res = await axios.get(url, { timeout: 30000 })

        // Convert response to Leaflet polyline coordinates
        const lines = res.data.elements
          .filter(el => el.type === "way" && el.geometry)
          .map(el => ({
            id: el.id,
            coordinates: el.geometry.map(g => [g.lat, g.lon]),
            tags: el.tags || {}
          }))

        setRailLines(lines)
      } catch (err) {
        console.error("Error fetching railway data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchRailways()
  }, [showRealRailways])

  // Real-time updates simulation
  useEffect(() => {
    if (isConnected) return // Don't simulate if real-time updates are available

    const interval = setInterval(() => {
      setTrains((prevTrains) =>
        prevTrains.map((train) => {
          // Simulate realistic movement along routes
          const speedVariation = (Math.random() - 0.5) * 10
          const newSpeed = Math.max(5, Math.min(train.speed + speedVariation, 
            train.type === "express" ? 120 : train.type === "local" ? 60 : 40))
          
          // Simulate position changes based on heading and speed
          const distanceKm = newSpeed / 3600 // Convert to distance per second
          const latChange = (distanceKm * Math.cos(train.heading * Math.PI / 180)) / 111
          const lonChange = (distanceKm * Math.sin(train.heading * Math.PI / 180)) / (111 * Math.cos(train.position[0] * Math.PI / 180))
          
          // Update status based on delay
          let newStatus = train.status
          const newDelay = train.delay + (Math.random() > 0.9 ? (Math.random() > 0.5 ? 1 : -1) : 0)
          
          if (newDelay > 5) newStatus = "delayed"
          else if (newDelay < -2) newStatus = "early"
          else newStatus = "on-time"
          
          return {
            ...train,
            position: [
              train.position[0] + latChange,
              train.position[1] + lonChange,
            ],
            speed: Math.round(newSpeed),
            delay: Math.max(-10, Math.min(30, newDelay)), // Limit delay between -10 and +30 minutes
            status: newStatus,
            lastUpdate: new Date().toISOString(),
          }
        })
      )
    }, 2000) // Update every 2 seconds for smoother animation

    return () => clearInterval(interval)
  }, [isConnected])

  // Custom marker creation for trains
  const createTrainMarker = (train) => {
    if (typeof window === "undefined") return null

    const L = require("leaflet")
    const color = getTrainColor(train.type, train.priority, train.status)
    
    return L.divIcon({
      html: `
        <div style="
          transform: rotate(${train.heading}deg); 
          width: 32px; 
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 28px; 
            height: 28px; 
            border-radius: 50%; 
            border: 3px solid white; 
            background-color: ${color}; 
            box-shadow: 0 3px 6px rgba(0,0,0,0.4); 
            display: flex; 
            align-items: center; 
            justify-content: center;
            position: relative;
          ">
            <div style="
              width: 10px; 
              height: 10px; 
              background-color: white; 
              border-radius: 50%;
            "></div>
            <div style="
              position: absolute; 
              top: -15px; 
              left: 50%; 
              transform: translateX(-50%); 
              width: 4px; 
              height: 15px; 
              background-color: white;
              border-radius: 2px;
            "></div>
            <div style="
              position: absolute; 
              bottom: -8px; 
              left: 50%; 
              transform: translateX(-50%); 
              background: rgba(0,0,0,0.7);
              color: white;
              font-size: 8px;
              padding: 1px 3px;
              border-radius: 2px;
              white-space: nowrap;
              font-weight: bold;
            ">${train.number}</div>
          </div>
        </div>
      `,
      className: "train-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })
  }

  // Create station markers
  const createStationMarker = (station) => {
    if (typeof window === "undefined") return null

    const L = require("leaflet")
    const color = getStationColor(station.platforms, station.type)
    
    return L.divIcon({
      html: `
        <div style="
          width: 20px; 
          height: 20px; 
          background-color: ${color}; 
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 6px; 
            height: 6px; 
            background-color: white; 
            border-radius: 50%;
          "></div>
        </div>
      `,
      className: "station-marker",
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })
  }

  const getTrainColor = (type, priority, status) => {
    if (status === "delayed") return "#ef4444" // red
    if (status === "early") return "#06d6a0" // green-blue
    if (type === "express") return "#8b5cf6" // purple
    if (type === "freight") return "#f59e0b" // amber
    return "#22c55e" // green for local
  }

  const getStationColor = (platforms, type) => {
    if (type === "major" || platforms >= 10) return "#1f2937" // Major station
    if (type === "junction") return "#7c3aed" // Junction
    if (platforms >= 6) return "#6b7280" // Medium station
    return "#9ca3af" // Small station
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "on-time": return "bg-green-500"
      case "delayed": return "bg-red-500"
      case "early": return "bg-blue-500"
      default: return "bg-gray-500"
    }
  }

  if (typeof window === "undefined") {
    return (
      <div className="h-full bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Loading enhanced railway map...</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative">

      <MapContainer 
        center={[23.259933,77.412615]} 
        zoom={12} 
        className="h-full w-full rounded-lg" 
        ref={mapRef}
      >
        {/* Map Tiles */}
        {mapMode === "railway" ? (
          <TileLayer
            url="https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a> contributors'
          />
        ) : (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        )}

        {/* Sample Railway tracks */}
        {/* <Polyline 
          positions={trackData.bhopalLine} 
          color="#dc2626" 
          weight={4} 
          opacity={0.8}
          dashArray="10, 5"
        /> */}

        {/* Real Railway Lines from OSM */}
        {/* {showRealRailways && railLines.map((line) => (
          <Polyline
            key={line.id}
            positions={line.coordinates}
            color="#ef4444"
            weight={2}
            opacity={0.6}
            dashArray="3, 3"
          />
        ))} */}

        {/* Stations */}
        {stations.map((station) => (
          <Marker
            key={station.id}
            position={station.position}
            icon={createStationMarker(station)}
          >
            <Popup>
              <div className="p-3 min-w-[180px]">
                <h3 className="font-semibold text-sm mb-2">{station.name}</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Station ID:</span>
                    <span className="font-medium">{station.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platforms:</span>
                    <span className="font-medium">{station.platforms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium capitalize">{station.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium text-[10px]">
                      {station.position[0].toFixed(4)}, {station.position[1].toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Train markers with enhanced popups */}
        {trains.map((train) => (
          <Marker 
            key={train.id} 
            position={train.position} 
            icon={createTrainMarker(train)}
          >
            <Popup maxWidth={280}>
              <div className="p-3 min-w-[260px]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">{train.name}</h3>
                    <p className="text-xs text-gray-600">#{train.number}</p>
                  </div>
                  <div className="flex gap-2">
                    <span
                      className="px-2 py-1 text-xs rounded-full text-white font-medium"
                      style={{ backgroundColor: getTrainColor(train.type, train.priority, train.status) }}
                    >
                      {train.type}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full text-white font-medium ${getStatusBadgeColor(train.status)}`}>
                      {train.status}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Train ID:</span>
                    <span className="font-medium">{train.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Speed:</span>
                    <span className="font-medium">{Math.round(train.speed)} km/h</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-600">Route:</span>
                    <span className="font-medium">{train.origin} → {train.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Next Station:</span>
                    <span className="font-medium">{train.nextStation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ETA:</span>
                    <span className="font-medium">{train.eta}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delay:</span>
                    <span className={`font-medium ${
                      train.delay > 0 ? "text-red-600" : 
                      train.delay < 0 ? "text-green-600" : "text-gray-900"
                    }`}>
                      {train.delay > 0 ? `+${train.delay}` : train.delay} min
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Priority:</span>
                    <span className="font-medium capitalize">{train.priority}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Coaches:</span>
                    <span className="font-medium">{train.coaches}</span>
                  </div>
                  {train.capacity > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Capacity:</span>
                      <span className="font-medium">{train.capacity}</span>
                    </div>
                  )}
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-600">Route Code:</span>
                    <span className="font-medium text-[10px]">{train.route}</span>
                  </div>
                  {train.lastUpdate && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-gray-600">Last Update:</span>
                      <span className="font-medium text-[10px]">
                        {new Date(train.lastUpdate).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

      </MapContainer>


      {/* Enhanced Legend */}
      <div className="absolute top-2 right-2 bg-white p-4 rounded-lg shadow-lg border z-[1000] max-h-[80vh] overflow-y-auto">
        <h4 className="font-semibold text-sm mb-3"> Legend</h4>
        
        {/* Trains Section */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#8b5cf6] border-2 border-white"></div>
              <span>Express Train</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#22c55e] border-2 border-white"></div>
              <span>Local Train</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#f59e0b] border-2 border-white"></div>
              <span>Freight Train</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#ef4444] border-2 border-white"></div>
              <span>Delayed Train</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#06d6a0] border-2 border-white"></div>
              <span>Early Train</span>
            </div>
        </div>
      </div>

      {/* Train Count Badge */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-2 py-1.5 rounded-lg z-[1000]">
        <div className="text-sm font-semibold">Live Trains: {trains.filter(t => t.status !== "stopped").length}</div>
        <div className="text-xs opacity-75">
          On Time: {trains.filter(t => t.status === "on-time").length} | 
          Delayed: {trains.filter(t => t.status === "delayed").length}
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute bottom-4 right-4 bg-white p-2 rounded-lg shadow-lg border z-[1000]">
        <h4 className="font-semibold text-sm mb-2">Map Controls</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <select 
              value={mapMode} 
              onChange={(e) => setMapMode(e.target.value)}
              className="text-xs border rounded px-1"
            >
              <option value="standard">Standard</option>
              <option value="railway">Railway Map</option>
            </select>
          </div>
          {loading && <div className="text-xs text-blue-600">Loading railways...</div>}
        </div>
      </div>    
    </div>
  )
}