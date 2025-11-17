import { NextResponse } from "next/server"
import { getKPIRecords, getCurrentKPIs, generateSampleKPIData } from "@/lib/models/kpi"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"

export async function GET(request) {
  try {
    const token = getTokenFromRequest(request)
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get("timeRange") || "24h"

    let records = await getKPIRecords(timeRange)

    // If no records exist, generate sample data
    if (records.length === 0) {
      records = await generateSampleKPIData(timeRange)
    }

    const currentKPIs = await getCurrentKPIs()

    return NextResponse.json({
      current: currentKPIs,
      historical: records,
      timeRange,
    })
  } catch (error) {
    console.error("Get KPIs error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
