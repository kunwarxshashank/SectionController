"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { TrendingUp, TrendingDown, Clock, Activity, Users, Target, RefreshCw } from "lucide-react"

export default function KPIDashboard() {
  const [kpiData, setKpiData] = useState(null)
  const [timeRange, setTimeRange] = useState("24h")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKPIData()
  }, [timeRange])

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchKPIData, 30000)
    return () => clearInterval(interval)
  }, [timeRange])

  const fetchKPIData = async () => {
    try {
      const response = await fetch(`/api/kpis?timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setKpiData(data)
      }
    } catch (error) {
      console.error("Failed to fetch KPI data:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    if (timeRange === "24h") {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    } else if (timeRange === "7d") {
      return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }
  }

  const getTrendIcon = (current, historical) => {
    if (!historical || historical.length < 2) return null
    const previous = historical[historical.length - 2]
    const isIncreasing = current > previous
    return isIncreasing ? (
      <TrendingUp className="h-4 w-4 text-[oklch(0.7_0.2_150)]" />
    ) : (
      <TrendingDown className="h-4 w-4 text-[oklch(0.6_0.23_25)]" />
    )
  }

  const getKPIColor = (value, type) => {
    switch (type) {
      case "throughput":
        return value >= 20 ? "text-[oklch(0.7_0.2_150)]" : "text-[oklch(0.82_0.16_90)]"
      case "avgDelay":
        return value <= 3
          ? "text-[oklch(0.7_0.2_150)]"
          : value <= 5
            ? "text-[oklch(0.82_0.16_90)]"
            : "text-[oklch(0.6_0.23_25)]"
      case "utilization":
        return value >= 80
          ? "text-[oklch(0.7_0.2_150)]"
          : value >= 60
            ? "text-[oklch(0.82_0.16_90)]"
            : "text-[oklch(0.6_0.23_25)]"
      case "punctuality":
        return value >= 90
          ? "text-[oklch(0.7_0.2_150)]"
          : value >= 80
            ? "text-[oklch(0.82_0.16_90)]"
            : "text-[oklch(0.6_0.23_25)]"
      default:
        return "text-foreground"
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-8 bg-muted rounded mb-1"></div>
                  <div className="h-3 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!kpiData) return null

  const { current, historical } = kpiData

  // Prepare chart data
  const chartData = historical.map((record) => ({
    ...record,
    time: formatTimestamp(record.timestamp),
  }))

  // Generate sample schedule data for Gantt chart
  const scheduleData = [
    { platform: "Platform 1", train: "T-401", start: 8, duration: 2, type: "express" },
    { platform: "Platform 1", train: "T-205", start: 11, duration: 1.5, type: "local" },
    { platform: "Platform 2", train: "T-302", start: 9, duration: 3, type: "freight" },
    { platform: "Platform 2", train: "T-150", start: 13, duration: 1, type: "express" },
    { platform: "Platform 3", train: "T-220", start: 10, duration: 2, type: "local" },
    { platform: "Platform 3", train: "T-180", start: 14, duration: 1.5, type: "local" },
  ]

  return (
    <div className="space-y-6">




      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-card to-card/95 border-2 border-[color:var(--irctc-blue)]/20 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Throughput</p>
                <p className={`text-3xl font-bold ${getKPIColor(current.throughput, "throughput")}`}>
                  {current.throughput}
                </p>
                <p className="text-xs text-muted-foreground">trains/hour</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {getTrendIcon(
                  current.throughput,
                  historical.map((h) => h.throughput),
                )}
                <div className="p-2 rounded-lg bg-[color:var(--irctc-blue)]/10">
                  <Activity className="h-6 w-6 text-[color:var(--irctc-blue)]" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/95 border-2 border-[oklch(0.82_0.16_90)]/20 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg Delay</p>
                <p className={`text-3xl font-bold ${getKPIColor(current.avgDelay, "avgDelay")}`}>{current.avgDelay}</p>
                <p className="text-xs text-muted-foreground">minutes</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {getTrendIcon(
                  current.avgDelay,
                  historical.map((h) => h.avgDelay),
                )}
                <div className="p-2 rounded-lg bg-[oklch(0.82_0.16_90)]/10">
                  <Clock className="h-6 w-6 text-[oklch(0.82_0.16_90)]" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/95 border-2 border-[oklch(0.7_0.2_150)]/20 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Utilization</p>
                <p className={`text-3xl font-bold ${getKPIColor(current.utilization, "utilization")}`}>
                  {current.utilization}%
                </p>
                <p className="text-xs text-muted-foreground">platform usage</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {getTrendIcon(
                  current.utilization,
                  historical.map((h) => h.utilization),
                )}
                <div className="p-2 rounded-lg bg-[oklch(0.7_0.2_150)]/10">
                  <Users className="h-6 w-6 text-[oklch(0.7_0.2_150)]" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/95 border-2 border-[oklch(0.71_0.2_50)]/20 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Punctuality</p>
                <p className={`text-3xl font-bold ${getKPIColor(current.punctuality, "punctuality")}`}>
                  {current.punctuality}%
                </p>
                <p className="text-xs text-muted-foreground">on-time arrivals</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {getTrendIcon(
                  current.punctuality,
                  historical.map((h) => h.punctuality),
                )}
                <div className="p-2 rounded-lg bg-[oklch(0.71_0.2_50)]/10">
                  <Target className="h-6 w-6 text-[oklch(0.71_0.2_50)]" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-card to-card/95 border-2 border-[color:var(--irctc-blue)]/20 shadow-lg">
          <CardHeader className="pb-3 bg-gradient-to-r from-[color:var(--irctc-blue)]/5 to-transparent border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-[color:var(--irctc-blue)]">Performance Trends</CardTitle>
              <div className="flex gap-2">
                {["24h", "7d", "30d"].map((range) => (
                  <Button
                    key={range}
                    variant={timeRange === range ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange(range)}
                    className={`text-xs ${timeRange === range ? "bg-[color:var(--irctc-blue)] text-white" : ""}`}
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" stroke="currentColor" />
                <XAxis 
                  dataKey="time" 
                  fontSize={11} 
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  stroke="hsl(var(--border))"
                />
                <YAxis 
                  fontSize={11} 
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  stroke="hsl(var(--border))"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "2px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="throughput"
                  stroke="oklch(27.004% 0.06738 262.727)"
                  strokeWidth={3}
                  name="Throughput"
                  dot={{ fill: "oklch(27.004% 0.06738 262.727)", r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="punctuality"
                  stroke="oklch(0.71 0.2 50)"
                  strokeWidth={3}
                  name="Punctuality %"
                  dot={{ fill: "oklch(0.71 0.2 50)", r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/95 border-2 border-[color:var(--irctc-blue)]/20 shadow-lg">
          <CardHeader className="pb-3 bg-gradient-to-r from-[color:var(--irctc-blue)]/5 to-transparent border-b border-border/50">
            <CardTitle className="text-lg font-bold text-[color:var(--irctc-blue)]">Delay & Utilization</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" stroke="currentColor" />
                <XAxis 
                  dataKey="time" 
                  fontSize={11} 
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  stroke="hsl(var(--border))"
                />
                <YAxis 
                  fontSize={11} 
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  stroke="hsl(var(--border))"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "2px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar 
                  dataKey="avgDelay" 
                  fill="oklch(0.82 0.16 90)" 
                  name="Avg Delay (min)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="utilization" 
                  fill="oklch(0.7 0.2 150)" 
                  name="Utilization %"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>





    </div>
  )
}
