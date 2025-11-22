import clientPromise from "../mongodb.js"

export async function findAllSections() {
  const client = await clientPromise
  const db = client.db("trainsection")

  return db.collection("sections").find({}).toArray()
}

export async function findSectionById(sectionId) {
  if (!sectionId) return null

  const client = await clientPromise
  const db = client.db("trainsection")

  return db.collection("sections").findOne({
    section_id: sectionId.toLowerCase(),
  })
}
