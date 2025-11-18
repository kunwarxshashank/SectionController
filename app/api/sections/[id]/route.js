import { connectDB } from "@/lib/mongodb.js"
import { findSectionById } from "@/lib/models/sections"

export async function GET(request, { params }) {
  try {
    await connectDB()

    const sectionId = params?.id?.toLowerCase()
    if (!sectionId) {
      return Response.json(
        { error: "Section ID is required" },
        { status: 400 }
      )
    }

    const section = await findSectionById(sectionId)
    if (!section) {
      return Response.json(
        { error: "Section not found" },
        { status: 404 }
      )
    }

    // ⬅️ RETURN EXACT DB DOCUMENT (NO MAPPING)
    return Response.json(section)

  } catch (error) {
    console.error("Error fetching section:", error)
    return Response.json(
      { error: "Failed to fetch section" },
      { status: 500 }
    )
  }
}
