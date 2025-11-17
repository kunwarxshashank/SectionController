import { connectDB } from "@/lib/mongodb.js"
import { NextResponse } from "next/server"
import { getAllTrains, createTrain } from "@/lib/models/train"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"

export async function GET(request) {


  try {
    const token = getTokenFromRequest(request)
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const trains = await getAllTrains()

    return NextResponse.json({ trains })
  } catch (error) {
    console.error("Get trains error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}




export async function POST(request) {
  try {
    const token = getTokenFromRequest(request)
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const trainData = await request.json()
    const train = await createTrain(trainData)

    return NextResponse.json({ train }, { status: 201 })
  } catch (error) {
    console.error("Create train error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
