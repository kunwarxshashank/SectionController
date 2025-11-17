import { NextResponse } from "next/server"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"
import { createAuditLog } from "@/lib/models/admin"
import { createRecommendation } from "@/lib/models/recommendation"

export async function POST(request) {
  try {
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)

    if (!token || !decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const eventData = await request.json()
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Simulate event processing and generate recommendations
    const recommendations = await generateEventRecommendations(eventData)

    // Create audit log
    await createAuditLog(decoded.adminId, "event_injection", {
      eventId,
      eventData,
      recommendationsGenerated: recommendations.length,
    })

    return NextResponse.json({
      success: true,
      eventId,
      event: eventData,
      recommendations,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("Event injection error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function generateEventRecommendations(eventData) {
  const recommendations = []

  // Generate contextual recommendations based on event type
  switch (eventData.type) {
    case "delay":
      recommendations.push(
        await createRecommendation({
          action: "priority_adjustment",
          rationale: `Train ${eventData.trainId} is experiencing a ${eventData.severity} delay. Recommend priority adjustment to minimize network impact.`,
          confidence: 88,
          affectedTrains: [eventData.trainId],
          estimatedBenefit: `Reduce delay propagation by ${Math.round(Number.parseInt(eventData.duration) * 0.6)} min`,
          actionType: "Adjust Priority",
          location: eventData.location || "Network-wide",
          urgency: eventData.severity === "high" ? "high" : "medium",
        }),
      )
      break

    case "breakdown":
      recommendations.push(
        await createRecommendation({
          action: "route_optimization",
          rationale: `Train ${eventData.trainId} breakdown detected. Recommend rerouting affected services and deploying backup resources.`,
          confidence: 92,
          affectedTrains: [eventData.trainId],
          estimatedBenefit: "Maintain 85% service level",
          actionType: "Emergency Reroute",
          location: eventData.location || "Affected section",
          urgency: "high",
        }),
      )
      break

    case "signal_failure":
      recommendations.push(
        await createRecommendation({
          action: "hold_recommendation",
          rationale: `Signal failure at ${eventData.location}. Recommend holding trains at safe distances until resolution.`,
          confidence: 95,
          affectedTrains: ["Jhelum Express", "T-205"], // Sample affected trains
          estimatedBenefit: "Ensure safety compliance",
          actionType: "Hold Trains",
          location: eventData.location,
          urgency: "high",
        }),
      )
      break
  }

  return recommendations
}
