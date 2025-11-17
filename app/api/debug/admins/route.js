import { connectDB } from "../../../../lib/mongodb.js"
import { findAllAdmins, createAdmin } from "../../../../lib/models/admin.js"
import { hashPassword } from "../../../../lib/auth.js"

export async function GET() {
  try {
    await connectDB()
    const admins = await findAllAdmins()

    return Response.json({
      success: true,
      count: admins.length,
      admins: admins.map((admin) => ({
        id: admin._id,
        email: admin.email,
        username: admin.username,
        createdAt: admin.createdAt,
      })),
    })
  } catch (error) {
    console.error("[v0] Error fetching admins:", error)
    return Response.json({ error: "Failed to fetch admins" }, { status: 500 })
  }
}

export async function POST() {
  try {
    await connectDB()

    const existingAdmins = await findAllAdmins()
    if (existingAdmins.length > 0) {
      return Response.json({
        message: "Admin users already exist",
        count: existingAdmins.length,
      })
    }

    const hashedPassword = await hashPassword("admin123")
    const admin = await createAdmin({
      username: "admin",
      email: "admin@railway.com",
      passwordHash: hashedPassword,
    })

    return Response.json({
      success: true,
      message: "Admin user created successfully",
      admin: {
        id: admin._id,
        email: admin.email,
        username: admin.username,
      },
    })
  } catch (error) {
    console.error("[v0] Error creating admin:", error)
    return Response.json({ error: "Failed to create admin" }, { status: 500 })
  }
}
