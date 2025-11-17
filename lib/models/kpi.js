import clientPromise from "../mongodb.js"

export async function createKPIRecord(kpiData) {
  const client = await clientPromise
  const db = client.db("train-tracking")

  const kpiRecord = {
    ...kpiData,
    timestamp: new Date(),
  }

  const result = await db.collection("kpi_records").insertOne(kpiRecord)
  return { ...kpiRecord, _id: result.insertedId }
}

export async function getKPIRecords(timeRange = "24h", limit = 100) {
  const client = await clientPromise
  const db = client.db("train-tracking")

  let startTime
  const now = new Date()

  switch (timeRange) {
    case "24h":
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case "7d":
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case "30d":
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }

  return await db
    .collection("kpi_records")
    .find({
      timestamp: { $gte: startTime },
    })
    .sort({ timestamp: 1 })
    .limit(limit)
    .toArray()
}

export async function getCurrentKPIs() {
  // In a real system, this would calculate KPIs from live data
  // For demo purposes, we'll return simulated current values
  const baseKPIs = {
    throughput: 24.5 + (Math.random() - 0.5) * 2,
    avgDelay: 3.2 + (Math.random() - 0.5) * 1,
    utilization: 87 + (Math.random() - 0.5) * 5,
    punctuality: 92 + (Math.random() - 0.5) * 3,
  }

  return {
    throughput: Math.round(baseKPIs.throughput * 10) / 10,
    avgDelay: Math.round(baseKPIs.avgDelay * 10) / 10,
    utilization: Math.round(baseKPIs.utilization),
    punctuality: Math.round(baseKPIs.punctuality),
    timestamp: new Date(),
  }
}

export async function generateSampleKPIData(timeRange = "24h") {
  const client = await clientPromise
  const db = client.db("train-tracking")

  // Clear existing data
  await db.collection("kpi_records").deleteMany({})

  const records = []
  let startTime, interval, count

  switch (timeRange) {
    case "24h":
      startTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
      interval = 60 * 60 * 1000 // 1 hour
      count = 24
      break
    case "7d":
      startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      interval = 6 * 60 * 60 * 1000 // 6 hours
      count = 28
      break
    case "30d":
      startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      interval = 24 * 60 * 60 * 1000 // 1 day
      count = 30
      break
    default:
      startTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
      interval = 60 * 60 * 1000
      count = 24
  }

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(startTime.getTime() + i * interval)
    const record = {
      timestamp,
      throughput: 20 + Math.random() * 10 + Math.sin(i / 4) * 5,
      avgDelay: 2 + Math.random() * 4 + Math.sin(i / 3) * 2,
      utilization: 75 + Math.random() * 20 + Math.sin(i / 5) * 10,
      punctuality: 85 + Math.random() * 10 + Math.sin(i / 6) * 5,
    }

    // Round values
    record.throughput = Math.round(record.throughput * 10) / 10
    record.avgDelay = Math.round(record.avgDelay * 10) / 10
    record.utilization = Math.round(record.utilization)
    record.punctuality = Math.round(record.punctuality)

    records.push(record)
  }

  await db.collection("kpi_records").insertMany(records)
  return records
}
