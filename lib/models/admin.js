import clientPromise from "../mongodb.js"
import { ObjectId } from "mongodb"

export async function createAdmin(adminData) {
  const client = await clientPromise
  const db = client.db("train-tracking")

  const admin = {
    ...adminData,
    createdAt: new Date(),
    role: "admin",
  }

  const result = await db.collection("admins").insertOne(admin)
  return { ...admin, _id: result.insertedId }
}

export async function findAdminByEmail(email) {
  const client = await clientPromise
  const db = client.db("train-tracking")

  return await db.collection("admins").findOne({ email })
}

export async function findAdminById(id) {
  const client = await clientPromise
  const db = client.db("train-tracking")

  try {
    const objectId = new ObjectId(id)
    return await db.collection("admins").findOne({ _id: objectId })
  } catch (error) {
    console.error("Invalid ObjectId:", id, error)
    return null
  }
}

export async function findAllAdmins() {
  const client = await clientPromise
  const db = client.db("train-tracking")

  return await db.collection("admins").find({}).toArray()
}

export async function createAuditLog(adminId, actionType, actionData) {
  const client = await clientPromise
  const db = client.db("train-tracking")

  const auditLog = {
    adminId,
    actionType,
    actionData,
    timestamp: new Date(),
  }

  await db.collection("audit_logs").insertOne(auditLog)
}
