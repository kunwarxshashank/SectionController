"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { checkAuth } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      console.log("[v0] Login - Starting login request")
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()
      console.log("[v0] Login - Response received:", { success: response.ok, data })

      if (response.ok) {
        console.log("[v0] Login - Success, updating auth state")
        await new Promise((resolve) => setTimeout(resolve, 500))

        await checkAuth()
        console.log("[v0] Login - Auth state updated, forcing page reload")

        window.location.replace("/")
      } else {
        setError(data.error || "Login failed")
      }
    } catch (error) {
      console.error("[v0] Login - Error:", error)
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.98_0.02_95)] via-background to-[oklch(0.95_0.02_260)] flex items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-5xl mx-auto grid gap-8 lg:grid-cols-[1.2fr,1fr] items-stretch">
        {/* Left: Indian Railways inspired hero */}
        <div className="relative overflow-hidden rounded-2xl border bg-card/95 backdrop-blur-sm shadow-xl">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -left-16 -top-24 h-64 w-64 rounded-full bg-[oklch(0.71_0.2_50)/0.15] blur-3xl" />
            <div className="absolute -right-10 bottom-0 h-56 w-56 rounded-full bg-[oklch(0.7_0.2_150)/0.12] blur-3xl" />
          </div>

          {/* Top identity bar */}
          <div className="relative border-b border-border bg-gradient-to-r from-[color:var(--irctc-blue)] via-[color:var(--irctc-blue)]/95 to-[oklch(0.16_0.03_260)] text-primary-foreground">
            <div className="flex items-center justify-between px-6 pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full border border-white/20 bg-background/10 flex items-center justify-center shadow-sm">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-medium tracking-[0.20em] uppercase text-white/80">
                    भारतीय रेल • Indian Railways
                  </p>
                  <p className="text-xs text-white/80">Network Control &amp; Monitoring System</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 rounded-full bg-black/10 border border-white/15 px-3 py-1 text-[11px] font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Control Room
              </div>
            </div>

            <div className="flex h-1 w-full">
              <div className="h-full flex-1 bg-[oklch(0.71_0.2_50)]" />
              <div className="h-full flex-1 bg-[oklch(1_0_0)]" />
              <div className="h-full flex-1 bg-[color:var(--irctc-blue)]" />
            </div>
          </div>

          {/* Hero content */}
          <div className="relative px-6 pb-6 pt-6 space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                Railway Control Center Login
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                Secure access for authorized Indian Railways officials to monitor train movements, signals and station
                operations across the national network.
              </p>
            </div>

         {/* Right: Login form */}
         <Card className="relative w-full max-w-md ml-auto bg-card/95 shadow-xl border border-border/80">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold tracking-tight">Official Login</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use your official Railway or IRCTC admin credentials to access the control dashboard.
                </p>
              </div>
              <span className="hidden md:inline-flex items-center rounded-full border bg-muted/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                Secure Zone
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Official email ID</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.name@gov.in"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <span className="text-[11px] text-muted-foreground">For internal Railway use only</span>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your secure password"
                  required
                  disabled={isLoading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-[color:var(--irctc-blue)] hover:bg-[color:var(--irctc-blue)]/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing you in…
                  </>
                ) : (
                  "Proceed to Dashboard"
                )}
              </Button>
            </form>

            <div className="mt-4 space-y-2 text-center">
              <p className="text-[11px] text-muted-foreground">
                Access is monitored and audited. Unauthorized use is prohibited and may attract action under applicable
                Railway regulations.
              </p>
            </div>

            <div className="mt-6 p-3 rounded-xl border border-dashed bg-muted/60">
              <p className="text-[11px] text-muted-foreground text-center">
                Sandbox demo credentials:
                <span className="font-semibold text-foreground"> admin@railway.com</span> /{" "}
                <span className="font-semibold text-foreground">admin123</span>
              </p>
            </div>
          </CardContent>
        </Card>

          </div>
        </div>


      </div>
    </div>
  )
}
