import { NextResponse } from "next/server"
import { addTrainPosition, getTrainById, getTrainPositions } from "@/lib/models/train"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"
import { broadcastToSection } from "@/lib/socket-server"

export async function POST(request, { params }) {
  try {
    const token = getTokenFromRequest(request)
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: trainId } = params
    const positionData = await request.json()

    const { lat, lon, speed, heading, source = "api" } = positionData

    if (!lat || !lon) {
      return NextResponse.json({ error: "Latitude and longitude are required" }, { status: 400 })
    }

    // Verify train exists
    const train = await getTrainById(trainId)
    if (!train) {
      return NextResponse.json({ error: "Train not found" }, { status: 404 })
    }

    // Save position to database
    const position = await addTrainPosition(trainId, {
      lat,
      lon,
      speed: speed || 0,
      heading: heading || 0,
      source,
    })

    // Broadcast real-time update to connected clients
    broadcastToSection("section-a1", "train-position-updated", {
      trainId,
      position: [lat, lon],
      speed: speed || 0,
      heading: heading || 0,
      timestamp: position.timestamp,
    })

    return NextResponse.json({ success: true, position })
  } catch (error) {
    console.error("Update train position error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request, { params }) {
  try {
    const token = getTokenFromRequest(request)
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: trainId } = params
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit")) || 50

    const positions = await getTrainPositions(trainId, limit)
    return NextResponse.json({ positions })
  } catch (error) {
    console.error("Get train positions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
