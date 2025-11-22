"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Activity, Target, Clock } from "lucide-react"
import { useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import PageHeader from "@/components/page-header"

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("7d")

  // Sample data - replace with actual API calls
  const reportData = {
    summary: {
      totalTrains: 1247,
      onTime: 1123,
      delayed: 124,
      avgDelay: 4.2,
      utilization: 78,
      punctuality: 90.1
    },
    trends: [
      { date: "Mon", trains: 180, onTime: 162, delayed: 18 },
      { date: "Tue", trains: 195, onTime: 178, delayed: 17 },
      { date: "Wed", trains: 210, onTime: 189, delayed: 21 },
      { date: "Thu", trains: 205, onTime: 185, delayed: 20 },
      { date: "Fri", trains: 225, onTime: 201, delayed: 24 },
      { date: "Sat", trains: 185, onTime: 168, delayed: 17 },
      { date: "Sun", trains: 247, onTime: 240, delayed: 7 },
    ]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.99_0.01_95)] via-[oklch(0.985_0.015_95)] to-[oklch(0.98_0.02_95)]">
      {/* Header */}
      <PageHeader 
        pageName="Reports & Analytics" 
        icon={FileText}
        showStats={true}
        actionButtons={
          <>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-white/10 text-primary-foreground border-white/30 hover:bg-white/20 shadow-md"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-white/10 text-primary-foreground border-white/30 hover:bg-white/20 shadow-md"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </>
        }
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-card to-card/95 border-2 border-[color:var(--irctc-blue)]/20 shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Trains</p>
                  <p className="text-3xl font-bold text-[color:var(--irctc-blue)]">{reportData.summary.totalTrains}</p>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </div>
                <div className="p-2 rounded-lg bg-[color:var(--irctc-blue)]/10">
                  <Activity className="h-6 w-6 text-[color:var(--irctc-blue)]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/95 border-2 border-[oklch(0.7_0.2_150)]/20 shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">On Time</p>
                  <p className="text-3xl font-bold text-[oklch(0.7_0.2_150)]">{reportData.summary.onTime}</p>
                  <p className="text-xs text-muted-foreground">{((reportData.summary.onTime / reportData.summary.totalTrains) * 100).toFixed(1)}%</p>
                </div>
                <div className="p-2 rounded-lg bg-[oklch(0.7_0.2_150)]/10">
                  <Target className="h-6 w-6 text-[oklch(0.7_0.2_150)]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/95 border-2 border-[oklch(0.82_0.16_90)]/20 shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Delayed</p>
                  <p className="text-3xl font-bold text-[oklch(0.82_0.16_90)]">{reportData.summary.delayed}</p>
                  <p className="text-xs text-muted-foreground">Avg: {reportData.summary.avgDelay} min</p>
                </div>
                <div className="p-2 rounded-lg bg-[oklch(0.82_0.16_90)]/10">
                  <Clock className="h-6 w-6 text-[oklch(0.82_0.16_90)]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/95 border-2 border-[oklch(0.71_0.2_50)]/20 shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Punctuality</p>
                  <p className="text-3xl font-bold text-[oklch(0.71_0.2_50)]">{reportData.summary.punctuality}%</p>
                  <p className="text-xs text-muted-foreground">Utilization: {reportData.summary.utilization}%</p>
                </div>
                <div className="p-2 rounded-lg bg-[oklch(0.71_0.2_50)]/10">
                  {/* <TrendingUp className="h-6 w-6 text-[oklch(0.71_0.2_50)]" /> */}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-card to-card/95 border-2 border-[color:var(--irctc-blue)]/20 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[color:var(--irctc-blue)]/5 to-transparent border-b border-border/50">
              <CardTitle className="text-lg font-bold text-[color:var(--irctc-blue)]">Weekly Performance</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData.trends}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="date" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "2px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="trains"
                    stroke="oklch(27.004% 0.06738 262.727)"
                    strokeWidth={3}
                    name="Total Trains"
                    dot={{ fill: "oklch(27.004% 0.06738 262.727)", r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="onTime"
                    stroke="oklch(0.7 0.2 150)"
                    strokeWidth={3}
                    name="On Time"
                    dot={{ fill: "oklch(0.7 0.2 150)", r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="delayed"
                    stroke="oklch(0.82 0.16 90)"
                    strokeWidth={3}
                    name="Delayed"
                    dot={{ fill: "oklch(0.82 0.16 90)", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-card/95 border-2 border-[color:var(--irctc-blue)]/20 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[color:var(--irctc-blue)]/5 to-transparent border-b border-border/50">
              <CardTitle className="text-lg font-bold text-[color:var(--irctc-blue)]">Daily Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.trends}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="date" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "2px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="onTime" fill="oklch(0.7 0.2 150)" name="On Time" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="delayed" fill="oklch(0.82 0.16 90)" name="Delayed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

