import { NextResponse } from "next/server"
import { broadcastToSection } from "@/lib/socket-server"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"

export async function POST(request) {
  try {
    const token = getTokenFromRequest(request)
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sectionId, event, data } = await request.json()

    if (!sectionId || !event || !data) {
      return NextResponse.json({ error: "Section ID, event, and data are required" }, { status: 400 })
    }

    // Broadcast the event to all connected clients in the section
    broadcastToSection(sectionId, event, data)

    return NextResponse.json({ success: true, message: "Event broadcasted" })
  } catch (error) {
    console.error("Broadcast error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
