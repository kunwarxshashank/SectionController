const PRIORITY_THRESHOLDS = {
  high: 8,
  medium: 5,
}

export function parseTimeToMinutes(timeStr) {
  if (!timeStr || timeStr === "—") return Number.POSITIVE_INFINITY
  const [hours, minutes] = timeStr.split(":").map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.POSITIVE_INFINITY
  return hours * 60 + minutes
}

export function classifyPriority(score = 0) {
  if (score >= PRIORITY_THRESHOLDS.high) return "high"
  if (score >= PRIORITY_THRESHOLDS.medium) return "medium"
  return "low"
}

function mapDelayStatus(status) {
  if (!status) return "on-time"
  return String(status).toLowerCase().replace("_", "-")
}

function normalizeType(type) {
  if (!type) return "express"
  const lowered = type.toLowerCase()
  if (["superfast", "express", "suburban", "freight", "special", "local", "relief"].includes(lowered)) {
    return lowered
  }
  return lowered
}

export function normalizeSectionSchedule(schedule = []) {
  return schedule.map((train) => {
    const type = normalizeType(train.trainType)
    const scheduledArrival = train.scheduled_arrival || "—"
    const scheduledMinutes = parseTimeToMinutes(scheduledArrival)
    const delayStatus = mapDelayStatus(train.current_delay?.delay_status)
    const delayMinutes = Number(train.current_delay?.delay ?? 0)
    const delayValue = Number.isNaN(delayMinutes) ? 0 : delayMinutes
    const priorityScore = train.base_priority ?? 0
    const priorityLevel = classifyPriority(priorityScore)

    return {
      raw: train,
      id: train.trainId,
      number: train.trainId,
      name: train.trainName,
      type,
      category: type === "local" ? "suburban" : type,
      scheduledArrival,
      scheduledDeparture: train.scheduled_departure || "—",
      scheduledMinutes,
      platform: train.platform,
      passengerCount: train.passenger_count,
      priorityScore,
      priorityLevel,
      priority: priorityLevel,
      status: delayStatus,
      delayStatus,
      delayMinutes: delayValue,
      delay: delayValue,
      delayReason: train.current_delay?.delay_reason,
      isEmergency: Boolean(train.is_emergency),
      hasCriticalCargo: Boolean(train.has_critical_cargo),
      location: train.current_delay?.delay_reason || `Near platform ${train.platform || "—"}`,
    }
  })
}

