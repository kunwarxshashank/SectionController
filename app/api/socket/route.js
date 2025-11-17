import { NextResponse } from "next/server"

export async function GET() {
  // This endpoint is just for Socket.IO initialization
  // The actual Socket.IO server is initialized in the custom server
  return NextResponse.json({ message: "Socket.IO server running" })
}
