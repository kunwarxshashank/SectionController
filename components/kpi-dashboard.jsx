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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-m text-muted-black w-5">Throughput</p>
                <p className={`text-2xl font-bold ${getKPIColor(current.throughput, "throughput")}`}>
                  {current.throughput}
                </p>
                <p className="text-sm text-zinc-600">trains/hour</p>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(
                  current.throughput,
                  historical.map((h) => h.throughput),
                )}
                <Activity className="h-8 w-8 text-chart-1 opacity-20" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-m text-muted-black w-5">Avg Delay</p>
                <p className={`text-2xl font-bold ${getKPIColor(current.avgDelay, "avgDelay")}`}>{current.avgDelay}</p>
                <p className="text-sm text-zinc-600">minutes</p>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(
                  current.avgDelay,
                  historical.map((h) => h.avgDelay),
                )}
                <Clock className="h-8 w-8 text-chart-2 opacity-20" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-m text-muted-black w-5">Utilization</p>
                <p className={`text-2xl font-bold ${getKPIColor(current.utilization, "utilization")}`}>
                  {current.utilization}%
                </p>
                <p className="text-sm text-zinc-600">platform usage</p>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(
                  current.utilization,
                  historical.map((h) => h.utilization),
                )}
                <Users className="h-8 w-8 text-chart-3 opacity-20" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-m text-muted-black w-5">Punctuality</p>
                <p className={`text-2xl font-bold ${getKPIColor(current.punctuality, "punctuality")}`}>
                  {current.punctuality}%
                </p>
                <p className="text-sm text-zinc-600">on-time arrivals</p>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(
                  current.punctuality,
                  historical.map((h) => h.punctuality),
                )}
                <Target className="h-8 w-8 text-chart-4 opacity-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Performance Trends</CardTitle>
              <div className="flex gap-2">
                {["24h", "7d", "30d"].map((range) => (
                  <Button
                    key={range}
                    variant={timeRange === range ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeRange(range)}
                    className="text-xs"
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="throughput"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  name="Throughput"
                  dot={{ fill: "red", stroke: "red" }}
                />

                <Line
                  type="monotone"
                  dataKey="punctuality"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  name="Punctuality %"
                  dot={{ fill: "red", stroke: "red" }}
                />

              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Delay & Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Bar dataKey="avgDelay" fill="hsl(var(--chart-2))" name="Avg Delay (min)" />
                <Bar dataKey="utilization" fill="hsl(var(--chart-3))" name="Utilization %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>





    </div>
  )
}
