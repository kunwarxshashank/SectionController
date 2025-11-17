import clientPromise from "../mongodb.js"

export async function findAllSections() {
  const client = await clientPromise
  const db = client.db("train-tracking")

  return await db.collection("sections").find({}).toArray()
}

export async function findSectionById(sectionId) {
  if (!sectionId) return null

  const client = await clientPromise
  const db = client.db("train-tracking")

  return await db.collection("sections").findOne({
    sectionId: sectionId.toLowerCase(),
  })
}

