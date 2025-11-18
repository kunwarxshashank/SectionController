import { connectDB } from "@/lib/mongodb.js"
import { findAllSections } from "@/lib/models/sections"

export async function GET() {
  try {
    await connectDB()

    // Fetch all sections as raw MongoDB documents
    const sections = await findAllSections()

    // Return raw data exactly as it is in DB
    return Response.json(sections)

  } catch (error) {
    console.error("Error fetching sections:", error)
    return Response.json(
      { error: "Failed to fetch sections" },
      { status: 500 }
    )
  }
}
