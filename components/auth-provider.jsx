"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    console.log("[v0] AuthProvider: Starting checkAuth")
    try {
      const response = await fetch("/api/auth/me")
      console.log("[v0] AuthProvider: API response status:", response.status)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] AuthProvider: Setting user:", data.admin)
        setUser(data.admin)
      } else {
        console.log("[v0] AuthProvider: API response not ok, setting user to null")
        setUser(null)
      }
    } catch (error) {
      console.log("[v0] AuthProvider: Error during checkAuth:", error)
      setUser(null)
    } finally {
      console.log("[v0] AuthProvider: Setting loading to false")
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      setUser(null)
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
