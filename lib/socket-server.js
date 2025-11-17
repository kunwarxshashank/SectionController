import { Server } from "socket.io"
import { addTrainPosition } from "./models/train.js"
import { verifyToken } from "./auth.js"

let io

export function initializeSocket(server) {
  if (io) return io

  io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:3000"],
      methods: ["GET", "POST"],
    },
  })

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error("Authentication error"))
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return next(new Error("Authentication error"))
    }

    socket.userId = decoded.adminId
    socket.userEmail = decoded.email
    next()
  })

  io.on("connection", (socket) => {
    console.log(`Admin connected: ${socket.userEmail}`)

    // Join section-specific room
    const sectionId = socket.handshake.query.sectionId || "section-a1"
    socket.join(sectionId)

    socket.on("disconnect", () => {
      console.log(`Admin disconnected: ${socket.userEmail}`)
    })

    // Handle manual train position updates
    socket.on("update-train-position", async (data) => {
      try {
        const { trainId, lat, lon, speed, heading } = data

        // Save to database
        await addTrainPosition(trainId, {
          lat,
          lon,
          speed,
          heading,
          source: "manual",
        })

        // Broadcast to all clients in the same section
        socket.to(sectionId).emit("train-position-updated", {
          trainId,
          position: [lat, lon],
          speed,
          heading,
          timestamp: new Date(),
        })
      } catch (error) {
        console.error("Error updating train position:", error)
        socket.emit("error", { message: "Failed to update train position" })
      }
    })
  })

  return io
}

export function getSocketIO() {
  return io
}

export function broadcastToSection(sectionId, event, data) {
  if (io) {
    io.to(sectionId).emit(event, data)
  }
}
