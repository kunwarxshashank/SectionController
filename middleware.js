import { NextResponse } from "next/server"
import { verifyTokenEdge } from "./lib/auth-edge"

export async function middleware(request) {
  console.log("[v0] Middleware - Path:", request.nextUrl.pathname)

  if (request.nextUrl.pathname === "/register") {
    return NextResponse.next()
  }

  // Only protect admin routes and root
  if (
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/dashboard")
  ) {
    const token = request.cookies.get("auth-token")?.value
    console.log("[v0] Middleware - Token found:", !!token)

    if (!token) {
      console.log("[v0] Middleware - No token, redirecting to login")
      return NextResponse.redirect(new URL("/login", request.url))
    }

    const decoded = await verifyTokenEdge(token)
    console.log("[v0] Middleware - Token valid:", !!decoded)
    if (!decoded) {
      console.log("[v0] Middleware - Invalid token, redirecting to login")
      return NextResponse.redirect(new URL("/login", request.url))
    }

    console.log("[v0] Middleware - Authentication successful, allowing access")
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|register).*)"],
}
