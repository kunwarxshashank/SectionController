import { connectDB } from "@/lib/mongodb.js"
import { findSectionById } from "@/lib/models/sections"

export async function GET(request, { params }) {
  try {
    await connectDB()

    const sectionId = params?.id?.toLowerCase()
    if (!sectionId) {
      return Response.json({ error: "Section ID is required" }, { status: 400 })
    }

    const section = await findSectionById(sectionId)
    if (!section) {
      return Response.json({ error: "Section not found" }, { status: 404 })
    }

    const formatted = {
      sectionId: section.sectionId,
      sectionName: section.sectionName,
      schedule: (section.schedule || []).map((schedule) => ({
        trainId: schedule.trainId,
        trainName: schedule.trainName,
        trainType: schedule.trainType,
        currentSpeed: schedule.currentSpeed,
        scheduled_arrival: schedule.scheduled_arrival,
        scheduled_departure: schedule.scheduled_departure,
        actual_arrival: schedule.actual_arrival,
        actual_departure: schedule.actual_departure,
        platform: schedule.platform,
        base_priority: schedule.base_priority,
        passenger_count: schedule.passenger_count,
        is_emergency: schedule.is_emergency,
        has_critical_cargo: schedule.has_critical_cargo,
        timestamp: schedule.timestamp,
        current_delay: schedule.current_delay
          ? {
              delay: schedule.current_delay.delay,
              delay_type: schedule.current_delay.delay_type,
              delay_reason: schedule.current_delay.delay_reason,
              delay_status: schedule.current_delay.delay_status,
            }
          : null,
      })),
    }

    return Response.json(formatted)
  } catch (error) {
    console.error("[v0] Error fetching section:", error)
    return Response.json({ error: "Failed to fetch section" }, { status: 500 })
  }
}