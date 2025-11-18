"use client"

import { useEffect, useState } from "react"
import { io } from "socket.io-client"

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || undefined
let socketInstance

function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    })
  }
  return socketInstance
}

export function useSectionRealtime(sectionId, { enabled = true } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(Boolean(enabled))

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }
    if (!sectionId) {
      setIsLoading(false)
      return
    }

    const socket = getSocket()
    const normalized = sectionId.toLowerCase()

    const handleConnect = () => setConnected(true)
    const handleDisconnect = () => setConnected(false)
    const handleUpdate = (payload) => {
      if (payload?.sectionId?.toLowerCase() !== normalized) return
      setData(payload)
      setIsLoading(false)
    }
    const handleError = (payload) => {
      if (payload?.sectionId && payload.sectionId.toLowerCase() !== normalized) return
      setError(payload?.message || "Realtime error")
      setIsLoading(false)
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("section:update", handleUpdate)
    socket.on("section:error", handleError)

    socket.emit("section:subscribe", { sectionId: normalized })

    return () => {
      socket.emit("section:unsubscribe", { sectionId: normalized })
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off("section:update", handleUpdate)
      socket.off("section:error", handleError)
    }
  }, [sectionId, enabled])

  return {
    data,
    error,
    connected,
    isLoading,
  }
}

