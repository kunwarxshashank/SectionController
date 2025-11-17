import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { createAdmin, findAdminByEmail } from "@/lib/models/admin"
import { hashPassword } from "@/lib/auth"

export async function POST(request) {
  try {
    await connectDB()

    const { email, username, password } = await request.json()

    // Validate required fields
    if (!email || !username || !password) {
      return NextResponse.json({ error: "Email, username, and password are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 })
    }

    // Check if admin already exists
    const existingAdmin = await findAdminByEmail(email)
    if (existingAdmin) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create new admin
    const newAdmin = await createAdmin({
      email,
      username,
      password: hashedPassword,
      role: "admin", // Default role
      createdAt: new Date(),
      lastLogin: null,
    })

    // Return success (don't include password in response)
    return NextResponse.json(
      {
        message: "Account created successfully",
        admin: {
          id: newAdmin._id,
          email: newAdmin.email,
          username: newAdmin.username,
          role: newAdmin.role,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
