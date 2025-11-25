"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Train } from "lucide-react"
import AIRecommendationsPanel from "./ai-recommendations-panel"
import UpcomingTrainsPanel from "@/components/comingtrain"
import SignalStatusPanel from "@/components/signal-status"
import Platform from "@/components/dashboard/platform"
import TrackControl from "@/components/dashboard/TrackControl"
import KPIDashboard from "./kpi-dashboard"
import MapWrapper from "@/components/Maps/MapWrapper"
import PageHeader from "./page-header"

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.99_0.01_95)] via-[oklch(0.985_0.015_95)] to-[oklch(0.98_0.02_95)] flex flex-col">

      {/* Header */}
      <PageHeader
        pageName="Network Control Center"
        icon={Train}
        showStats={true}
      />


      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden bg-gradient-to-br from-[oklch(0.99_0.01_95)] to-[oklch(0.97_0.015_95)]">
        {/* Left Upcoming Trains Panel */}
        <aside className="w-[18%] border-r-2 border-[color:var(--irctc-blue)]/20 overflow-auto bg-gradient-to-b from-card/95 to-card/90 backdrop-blur-sm shadow-inner">
          <UpcomingTrainsPanel />
        </aside>

        {/* Center Map */}
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full h-full bg-gradient-to-br from-card to-card/95 shadow-xl border-2 border-[color:var(--irctc-blue)]/20 rounded-xl overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-[color:var(--irctc-blue)]/10 to-transparent border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-[color:var(--irctc-blue)]">
                <div className="p-1.5 rounded-lg bg-[color:var(--irctc-blue)]/10">
                  <Activity className="h-5 w-5" />
                </div>
                <span className="font-bold">Track Control System</span>
                <Badge variant="outline" className="ml-auto bg-[oklch(0.7_0.2_150)]/10 text-[oklch(0.7_0.2_150)] border-[oklch(0.7_0.2_150)]/30 text-xs">
                  LIVE
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-80px)] p-0">
              <TrackControl />
            </CardContent>
          </Card>
        </main>

        {/* Right AI Recommendations */}
        <aside className="w-[25%] border-l-2 border-[color:var(--irctc-blue)]/20 overflow-auto bg-gradient-to-b from-card/95 to-card/90 backdrop-blur-sm shadow-inner">
          <AIRecommendationsPanel />
        </aside>
      </div>

      {/* Live Map Section */}
      <div className="border-t-2 border-[color:var(--irctc-blue)]/20 bg-gradient-to-br from-card/98 to-card/95 p-6 shadow-inner">
        <Card className="w-full bg-gradient-to-br from-card to-card/95 shadow-xl border-2 border-[color:var(--irctc-blue)]/20 rounded-xl overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-[color:var(--irctc-blue)]/10 to-transparent border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-[color:var(--irctc-blue)]">
              <div className="p-1.5 rounded-lg bg-[color:var(--irctc-blue)]/10">
                <Activity className="h-5 w-5" />
              </div>
              <span className="font-bold">Live Train Map</span>
              <Badge variant="outline" className="ml-auto bg-[oklch(0.7_0.2_150)]/10 text-[oklch(0.7_0.2_150)] border-[oklch(0.7_0.2_150)]/30 text-xs">
                LIVE
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[500px] p-0">
            <MapWrapper />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Panel - KPIs */}
      <div className="border-t-2 border-[color:var(--irctc-blue)]/20 bg-gradient-to-br from-card/98 to-card/95 p-6 shadow-inner">
        <KPIDashboard />
      </div>

    </div>
  )
}
