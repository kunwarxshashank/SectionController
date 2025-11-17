"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { Clock, AlertTriangle, User, Activity, LogOut, Settings, Train } from "lucide-react"
import { useRouter } from "next/navigation"
import AIRecommendationsPanel from "./ai-recommendations-panel"
import UpcomingTrainsPanel from "@/components/comingtrain"
import SignalStatusPanel from "@/components/signal-status"
import Platform from "@/components/dashboard/platform"
import KPIDashboard from "./kpi-dashboard"
import MapWrapper from "@/components/Maps/MapWrapper"
import IstClock from "@/components/dashboard/clock"

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const router = useRouter()


  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <header className="border-b border-border bg-gradient-to-r from-[color:var(--irctc-blue)] via-[color:var(--irctc-blue)]/95 to-[oklch(0.16_0.03_260)] px-6 py-3 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full border border-white/20 bg-background/10 flex items-center justify-center shadow-sm">
                <Train className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-[0.18em] text-white/80">
                  भारतीय रेल • Indian Railways
                </span>
                <h1 className="text-lg font-semibold leading-tight">
                  Network Control Center
                </h1>
              </div>
            </div>
            <Badge variant="secondary" className="hidden md:inline-flex items-center gap-1 bg-[oklch(0.71_0.2_50)]/90 text-white border-white/10 text-[11px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
              BHOPAL – ITARSI SECTION
            </Badge>
            <div className="hidden lg:flex items-center gap-2 text-xs text-white/80">
              <Clock className="h-4 w-4" />
              <span>Control Room Time:</span>
              <IstClock />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs">
              <AlertTriangle className="h-4 w-4 text-[oklch(0.6_0.23_25)]" />
              <span className="font-medium">2 Active Alerts</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin")}
              className="flex items-center gap-2 bg-white/10 text-primary-foreground border-white/20 hover:bg-white/20"
            >
              <Settings className="h-4 w-4" />
              Admin
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="flex items-center gap-2 bg-[oklch(0.6_0.23_25)] text-white border-white/10 hover:bg-[oklch(0.6_0.23_25)]/90"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
        <div className="mt-3 h-0.5 w-full flex overflow-hidden rounded-full">
          <div className="flex-1 bg-[oklch(0.71_0.2_50)]" />
          <div className="flex-1 bg-[oklch(1_0_0)]" />
          <div className="flex-1 bg-[color:var(--irctc-blue)]" />
        </div>
      </header>


      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden bg-[oklch(0.985_0.015_95)]">
        {/* Left Upcoming Trains Panel */}
        <aside className="w-[18%] border-r border-border/70 overflow-auto bg-card/80 backdrop-blur-sm">
          <UpcomingTrainsPanel />
        </aside>

        {/* Center Map */}
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full h-full bg-card/95 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Train Map
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-80px)]">
              <MapWrapper />
            </CardContent>
          </Card>
        </main>

        {/* Right AI Recommendations */}
        <aside className="w-[25%] border-s border-border/70 overflow-auto bg-card/80 backdrop-blur-sm">
          <AIRecommendationsPanel />
        </aside>
      </div>

      {/* <div className="border-t border-border bg-card p-6">
        <SignalStatusPanel/>
      </div> */}

      <div className="border-t border-border bg-card/95 p-6">
        <Platform/>
      </div>


      {/* Bottom Panel - KPIs */}
      <div className="border-t border-border bg-card/95 p-6">
        <KPIDashboard />
      </div>

    </div>
  )
}
