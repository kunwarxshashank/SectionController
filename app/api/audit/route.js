import { NextResponse } from "next/server"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"

export async function GET(request) {
  try {
    const token = getTokenFromRequest(request)
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const actionType = searchParams.get("actionType")
    const dateRange = searchParams.get("dateRange") || "7d"
    const search = searchParams.get("search")

    const client = await clientPromise
    const db = client.db("trainsection")

    // Build query
    const query = {}

    if (actionType && actionType !== "all") {
      query.actionType = actionType
    }

    if (dateRange !== "all") {
      const days = Number.parseInt(dateRange.replace("d", ""))
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      query.timestamp = { $gte: startDate }
    }

    if (search) {
      query.$or = [
        { actionType: { $regex: search, $options: "i" } },
        { "actionData.trainId": { $regex: search, $options: "i" } },
      ]
    }

    const logs = await db.collection("audit_logs").find(query).sort({ timestamp: -1 }).limit(100).toArray()

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Get audit logs error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
