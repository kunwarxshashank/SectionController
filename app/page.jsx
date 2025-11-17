"use client"
import { useAuth } from "@/components/auth-provider.jsx"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import DashboardLayout from "@/components/dashboard-layout"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!loading && !user) {
      console.log("[v0] HomePage: No user found, redirecting to login")
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="relative inline-flex items-center justify-center">
            <div className="h-12 w-12 rounded-full border-2 border-[color:var(--irctc-blue)]/20 border-t-[color:var(--irctc-blue)] animate-spin" />
            <div className="absolute inset-1 rounded-full bg-[color:var(--irctc-blue)]/5" />
          </div>
          <p className="text-sm text-muted-foreground">Preparing Railway Control Center…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login via useEffect
  }
  return <DashboardLayout />
}
