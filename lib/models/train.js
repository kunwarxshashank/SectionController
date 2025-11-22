import clientPromise from "../mongodb.js"

export async function createTrain(trainData) {
  const client = await clientPromise
  const db = client.db("trainsection")

  const train = {
    ...trainData,
    active: true,
    createdAt: new Date(),
  }

  const result = await db.collection("trains").insertOne(train)
  return { ...train, _id: result.insertedId }
}

export async function getAllTrains() {
  const client = await clientPromise
  const db = client.db("trainsection")
  return await db.collection("trains").find({ active: true }).toArray()
}


export async function getTrainById(trainId) {
  const client = await clientPromise
  const db = client.db("trainsection")

  return await db.collection("trains").findOne({ trainId, active: true })
}

export async function updateTrain(trainId, updateData) {
  const client = await clientPromise
  const db = client.db("trainsection")

  const result = await db
    .collection("trains")
    .updateOne({ trainId }, { $set: { ...updateData, updatedAt: new Date() } })

  return result.modifiedCount > 0
}

export async function deleteTrain(trainId) {
  const client = await clientPromise
  const db = client.db("trainsection")

  const result = await db
    .collection("trains")
    .updateOne({ trainId }, { $set: { active: false, deletedAt: new Date() } })

  return result.modifiedCount > 0
}

export async function addTrainPosition(trainId, positionData) {
  const client = await clientPromise
  const db = client.db("trainsection")

  const position = {
    trainId,
    ...positionData,
    timestamp: new Date(),
    source: positionData.source || "manual",
  }

  await db.collection("train_positions").insertOne(position)
  return position
}

export async function getTrainPositions(trainId, limit = 50) {
  const client = await clientPromise
  const db = client.db("trainsection")

  return await db.collection("train_positions").find({ trainId }).sort({ timestamp: -1 }).limit(limit).toArray()
}
