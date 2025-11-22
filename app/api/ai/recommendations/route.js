import { NextResponse } from "next/server"
import { getActiveRecommendations, generateSampleRecommendations } from "@/lib/models/recommendation"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"

export async function GET(request) {
  try {
    const token = getTokenFromRequest(request)
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let recommendations = await getActiveRecommendations()

    // If no recommendations exist, generate sample ones
    if (recommendations.length === 0) {
      recommendations = await generateSampleRecommendations()
    }

    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error("Get recommendations error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
