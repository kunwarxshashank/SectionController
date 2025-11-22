/*xport async function createRecommendation(recommendationData) {
  const client = await clientPromise
  const db = client.db("train-tracking")

  const recommendation = {
    ...recommendationData,
    id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    status: "pending",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
  }

  const result = await db.collection("recommendations").insertOne(recommendation)
  return { ...recommendation, _id: result.insertedId }
}

export async function getActiveRecommendations() {
  const client = await clientPromise
  const db = client.db("train-tracking")

  return await db
    .collection("recommendations")
    .find({
      status: "pending",
      expiresAt: { $gt: new Date() },
    })
    .sort({ timestamp: -1 })
    .toArray()
}

export async function updateRecommendationStatus(recommendationId, status, adminId, notes = null) {
  const client = await clientPromise
  const db = client.db("train-tracking")

  const updateData = {
    status,
    processedBy: adminId,
    processedAt: new Date(),
  }

  if (notes) {
    updateData.adminNotes = notes
  }

  const result = await db.collection("recommendations").updateOne({ id: recommendationId }, { $set: updateData })

  return result.modifiedCount > 0
}

export async function getRecommendationById(recommendationId) {
  const client = await clientPromise
  const db = client.db("train-tracking")

  return await db.collection("recommendations").findOne({ id: recommendationId })
}

// Generate sample AI recommendations
export async function generateSampleRecommendations() {
  const recommendations = [
    {
      action: "priority_adjustment",
      rationale:
        "Jhelum Express is running 2 minutes behind schedule. Giving priority at Junction J-12 will reduce overall network delay by 8 minutes and improve punctuality metrics.",
      confidence: 95,
      affectedTrains: ["11078"],
      estimatedBenefit: "Reduce avg delay by 8 min",
      actionType: "Give Priority",
      location: "Bhopal Junction",
      urgency: "high",
    },
    {
      action: "route_optimization",
      rationale:
        "Platform congestion detected at Station Misrod. Rerouting Train Rajdhani Express via Platform 3 will avoid 12-minute delay and optimize platform utilization.",
      confidence: 87,
      affectedTrains: ["22692"],
      estimatedBenefit: "Avoid 12 min delay",
      actionType: "Reroute Train",
      location: "Station A → Platform 3",
      urgency: "medium",
    },
    {
      action: "speed_adjustment",
      rationale:
        "Freight Train 12626 can increase speed by 15 km/h on current section without safety concerns. This will improve schedule adherence.",
      confidence: 78,
      affectedTrains: ["12626"],
      estimatedBenefit: "Improve schedule by 5 min",
      actionType: "Speed Increase",
      location: "Section B-C",
      urgency: "low",
    },
    {
      action: "hold_recommendation",
      rationale:
        "Special Express approaching Junction J-2. Recommend holding Local T-205 for 3 minutes to maintain express priority and network efficiency.",
      confidence: 92,
      affectedTrains: ["07024"],
      estimatedBenefit: "Maintain express priority",
      actionType: "Hold Train",
      location: "Junction J-2",
      urgency: "high",
    },
  ]

  const client = await clientPromise
  const db = client.db("train-tracking")

  // Clear existing pending recommendations
  await db.collection("recommendations").deleteMany({ status: "pending" })

  // Insert new recommendations
  const results = []
  for (const rec of recommendations) {
    const created = await createRecommendation(rec)
    results.push(created)
  }

  return results
}
*/