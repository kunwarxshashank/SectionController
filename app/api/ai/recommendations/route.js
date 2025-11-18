import { NextResponse } from "next/server"
import { getActiveRecommendations, generateSampleRecommendations } from "@/lib/models/recommendation"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"
import { findSectionById } from "@/lib/models/sections"

export async function GET(request) {
  try {

    // Validating token for authentication
    const token = getTokenFromRequest(request)
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Decoding token for admin id
    const decoded = verifyToken(token)
    const username = decoded.username
    console.log("username", username)
    if (!username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetching section for recommendations
    const section = await findSectionById("bpl")
    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 })
    }


    // let recommendations = await getActiveRecommendations()

    // // If no recommendations exist, generate sample ones
    // if (recommendations.length === 0) {
    //   recommendations = await generateSampleRecommendations()
    // }

    return NextResponse.json({ section })
  } catch (error) {
    console.error("Get recommendations error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
