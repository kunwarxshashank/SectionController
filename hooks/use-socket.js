"use client"

import { useEffect, useRef, useState } from "react"
import { io } from "socket.io-client"

export function useSocket(sectionId = "section-a1") {
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Get auth token from cookies
    const getAuthToken = () => {
      const cookies = document.cookie.split(";")
      const authCookie = cookies.find((c) => c.trim().startsWith("auth-token="))
      return authCookie ? authCookie.split("=")[1] : null
    }

    const token = getAuthToken()
    if (!token) {
      setError("No authentication token found")
      return
    }

    // Initialize socket connection
    socketRef.current = io({
      auth: { token },
      query: { sectionId },
    })

    const socket = socketRef.current

    socket.on("connect", () => {
      console.log("Socket connected")
      setIsConnected(true)
      setError(null)
    })

    socket.on("disconnect", () => {
      console.log("Socket disconnected")
      setIsConnected(false)
    })

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err)
      setError(err.message)
      setIsConnected(false)
    })

    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [sectionId])

  const emit = (event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data)
    }
  }

  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback)
      return () => socketRef.current.off(event, callback)
    }
  }

  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback)
    }
  }

  return {
    socket: socketRef.current,
    isConnected,
    error,
    emit,
    on,
    off,
  }
}
