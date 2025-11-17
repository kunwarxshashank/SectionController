import { NextResponse } from "next/server"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"
import { createAuditLog } from "@/lib/models/admin"

export async function POST(request) {
  try {
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)

    if (!token || !decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { scenarioId, events } = await request.json()
    const startTime = Date.now()

    // Simulate scenario processing
    const results = await processScenario(scenarioId, events)
    const duration = Date.now() - startTime

    // Create audit log
    await createAuditLog(decoded.adminId, "simulation", {
      scenarioId,
      eventsProcessed: events.length,
      duration,
      results: results.summary,
    })

    return NextResponse.json({
      ...results,
      duration,
      eventsProcessed: events.length,
    })
  } catch (error) {
    console.error("Simulation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function processScenario(scenarioId, events) {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Generate mock results based on scenario
  const kpiImpact = [
    { metric: "Throughput", change: "-15%", impact: "negative" },
    { metric: "Avg Delay", change: "+8 min", impact: "negative" },
    { metric: "Utilization", change: "-5%", impact: "negative" },
    { metric: "Punctuality", change: "-12%", impact: "negative" },
  ]

  const recommendations = [
    {
      action: "Emergency rerouting",
      rationale: "Redirect traffic through alternate routes",
      confidence: 89,
    },
    {
      action: "Priority adjustment",
      rationale: "Give priority to express services",
      confidence: 76,
    },
  ]

  return {
    kpiImpact,
    recommendations,
    summary: `Scenario ${scenarioId} completed. Network performance impacted by ${events.length} events.`,
  }
}
