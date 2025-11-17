import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key"

export async function hashPassword(password) {
  return await bcrypt.hash(password, 12)
}

export async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword)
}

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" })
}

export function verifyToken(token) {
  try {
    console.log("[v0] Verifying token:", token ? "token exists" : "no token")
    console.log("[v0] JWT_SECRET exists:", JWT_SECRET ? "yes" : "no")
    const decoded = jwt.verify(token, JWT_SECRET)
    console.log("[v0] Token verified successfully:", decoded)
    return decoded
  } catch (error) {
    console.log("[v0] Token verification failed:", error.message)
    return null
  }
}

export function getTokenFromRequest(request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    console.log("[v0] Found token in Authorization header")
    return authHeader.substring(7)
  }

  // Also check cookies
  const cookies = request.headers.get("cookie")
  console.log("[v0] Cookies:", cookies)
  if (cookies) {
    const tokenCookie = cookies.split(";").find((c) => c.trim().startsWith("auth-token="))
    if (tokenCookie) {
      const token = tokenCookie.split("=")[1]
      console.log("[v0] Found token in cookies:", token ? "token exists" : "no token")
      return token
    }
  }

  console.log("[v0] No token found in request")
  return null
}
