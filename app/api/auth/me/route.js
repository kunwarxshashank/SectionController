import { NextResponse } from "next/server"
import { getTokenFromRequest, verifyToken } from "@/lib/auth"
import { findAdminById } from "@/lib/models/admin"

export async function GET(request) {
  try {
    const token = getTokenFromRequest(request)
    console.log("[v0] Token found:", !!token)

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    console.log("[v0] Token decoded:", !!decoded, decoded?.adminId)

    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const admin = await findAdminById(decoded.adminId)
    console.log("[v0] Admin found:", !!admin)

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    return NextResponse.json({
      admin: {
        id: admin._id,
        email: admin.email,
        username: admin.username,
        role: admin.role,
      },
    })
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
