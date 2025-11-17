"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Download } from "lucide-react"

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    actionType: "all",
    dateRange: "7d",
    search: "",
  })

  useEffect(() => {
    fetchAuditLogs()
  }, [filters])

  const fetchAuditLogs = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.actionType !== "all") params.append("actionType", filters.actionType)
      if (filters.dateRange !== "all") params.append("dateRange", filters.dateRange)
      if (filters.search) params.append("search", filters.search)

      const response = await fetch(`/api/audit?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (actionType) => {
    switch (actionType) {
      case "ai_decision":
        return "bg-blue-100 text-blue-800"
      case "train_update":
        return "bg-green-100 text-green-800"
      case "event_injection":
        return "bg-yellow-100 text-yellow-800"
      case "simulation":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatActionData = (actionData) => {
    if (typeof actionData === "string") return actionData
    if (actionData.decision) return `Decision: ${actionData.decision}`
    if (actionData.trainId) return `Train: ${actionData.trainId}`
    return JSON.stringify(actionData).substring(0, 50) + "..."
  }

  const exportLogs = async () => {
    try {
      const response = await fetch("/api/audit/export")
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Failed to export logs:", error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Logs
            </CardTitle>
            <Button onClick={exportLogs} variant="outline" className="flex items-center gap-2 bg-transparent">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="max-w-sm"
              />
            </div>
            <Select value={filters.actionType} onValueChange={(value) => setFilters({ ...filters, actionType: value })}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="ai_decision">AI Decisions</SelectItem>
                <SelectItem value="train_update">Train Updates</SelectItem>
                <SelectItem value="event_injection">Event Injections</SelectItem>
                <SelectItem value="simulation">Simulations</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.dateRange} onValueChange={(value) => setFilters({ ...filters, dateRange: value })}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Today</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No audit logs found matching your criteria.</div>
            ) : (
              logs.map((log) => (
                <div key={log._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Badge className={getActionColor(log.actionType)}>{log.actionType}</Badge>
                    <div>
                      <div className="font-medium text-sm">Admin: {log.adminEmail || log.adminId}</div>
                      <div className="text-sm text-muted-foreground">{formatActionData(log.actionData)}</div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
