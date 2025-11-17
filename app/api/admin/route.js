import { connectDB } from "@/lib/mongodb.js"
import { findAllAdmins } from "@/lib/models/admin.js"

export async function GET() {
    try {
      await connectDB()
      const admins = await findAllAdmins()
  
      return Response.json(admins.map((admin) => ({
          id: admin._id,
          username: admin.username,
          name: admin.name,
        }))
      )
    } catch (error) {
      console.error("[v0] Error fetching admins:", error)
      return Response.json({ error: "Failed to fetch admins" }, { status: 500 })
    }
  }