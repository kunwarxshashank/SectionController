import { NextResponse } from "next/server"
import { updateRecommendationStatus, getRecommendationById } from "@/lib/models/recommendation"
import { createAuditLog } from "@/lib/models/admin"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"

export async function POST(request) {
  try {
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)

    if (!token || !decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { recommendationId, decision, notes } = await request.json()

    if (!recommendationId || !decision) {
      return NextResponse.json({ error: "Recommendation ID and decision are required" }, { status: 400 })
    }

    if (!["accepted", "rejected", "overridden"].includes(decision)) {
      return NextResponse.json(
        { error: "Invalid decision. Must be accepted, rejected, or overridden" },
        { status: 400 },
      )
    }

    // Get the recommendation details for audit log
    const recommendation = await getRecommendationById(recommendationId)
    if (!recommendation) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 })
    }

    // Update recommendation status
    const updated = await updateRecommendationStatus(recommendationId, decision, decoded.adminId, notes)

    if (!updated) {
      return NextResponse.json({ error: "Failed to update recommendation" }, { status: 500 })
    }

    // Create audit log
    await createAuditLog(decoded.adminId, "ai_decision", {
      recommendationId,
      decision,
      action: recommendation.action,
      affectedTrains: recommendation.affectedTrains,
      confidence: recommendation.confidence,
      adminNotes: notes,
      timestamp: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: `Recommendation ${decision} successfully`,
    })
  } catch (error) {
    console.error("AI decision error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
