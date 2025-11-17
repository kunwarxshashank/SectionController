"use client"

import React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock, Wrench, Zap, CheckCircle } from "lucide-react"

export default function EventSimulation() {
  const [eventData, setEventData] = useState({
    type: "delay",
    trainId: "",
    severity: "medium",
    duration: "",
    description: "",
    location: "",
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")

  const eventTypes = [
    { value: "delay", label: "Delay", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
    { value: "breakdown", label: "Breakdown", icon: Wrench, color: "bg-red-100 text-red-800" },
    { value: "signal_failure", label: "Signal Failure", icon: Zap, color: "bg-orange-100 text-orange-800" },
    { value: "track_maintenance", label: "Track Maintenance", icon: AlertTriangle, color: "bg-blue-100 text-blue-800" },
  ]

  const severityLevels = [
    { value: "low", label: "Low", description: "Minor impact, 1-5 minutes" },
    { value: "medium", label: "Medium", description: "Moderate impact, 5-15 minutes" },
    { value: "high", label: "High", description: "Major impact, 15+ minutes" },
  ]

  const sampleTrains = ["Jhelum Express", "Rajdhani Express", "Kerala Express", "Goa Express"]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const response = await fetch("/api/simulation/inject-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      })

      if (response.ok) {
        const data = await response.json()
        setResult(data)
        // Reset form
        setEventData({
          type: "delay",
          trainId: "",
          severity: "medium",
          duration: "",
          description: "",
          location: "",
        })
      } else {
        const data = await response.json()
        setError(data.error || "Failed to inject event")
      }
    } catch (error) {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const getEventIcon = (type) => {
    const eventType = eventTypes.find((et) => et.value === type)
    return eventType ? eventType.icon : AlertTriangle
  }

  const getEventColor = (type) => {
    const eventType = eventTypes.find((et) => et.value === type)
    return eventType ? eventType.color : "bg-gray-100 text-gray-800"
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Event Simulation
          </CardTitle>
          <p className="text-sm text-muted-primary">
            Inject disruption events to test system response and AI recommendations
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventType">Event Type</Label>
                <Select value={eventData.type} onValueChange={(value) => setEventData({ ...eventData, type: value })}>
                  <SelectTrigger className="border border-input bg-grey-200 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="trainId">Affected Train</Label>
                <Select
                  value={eventData.trainId}
                  onValueChange={(value) => setEventData({ ...eventData, trainId: value })}
                >
                  <SelectTrigger className="border border-input bg-grey-200 rounded-md">
                    <SelectValue placeholder="Select train" className="text-gray-400" />
                  </SelectTrigger>
                  <SelectContent>
                    {sampleTrains.map((trainId) => (
                      <SelectItem key={trainId} value={trainId}>
                        {trainId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="severity">Severity</Label>
                <Select
                  value={eventData.severity}
                  onValueChange={(value) => setEventData({ ...eventData, severity: value })}
                >
                  <SelectTrigger className="border border-input bg-grey-200 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {severityLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div>
                          <div className="font-medium">{level.label}</div>
                          <div className="text-xs text-muted-foreground">{level.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={eventData.duration}
                  onChange={(e) => setEventData({ ...eventData, duration: e.target.value })}
                  placeholder="15"
                  min="1"
                  max="120"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={eventData.location}
                onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                placeholder="Junction J-12, Platform 3, etc."
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={eventData.description}
                onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                placeholder="Describe the event details..."
                rows={3}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Event injected successfully! {result.recommendations?.length || 0} AI recommendations generated.
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading || !eventData.trainId}>
              {loading ? "Injecting Event..." : "Inject Event"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Simulation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getEventColor(result.event?.type)}>
                  {React.createElement(getEventIcon(result.event?.type), { className: "h-3 w-3" })}
                  {result.event?.type}
                </Badge>
                <span className="text-sm">
                  Affected Train: <strong>{result.event?.trainId}</strong>
                </span>
              </div>

              {result.recommendations && result.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Generated Recommendations:</h4>
                  <div className="space-y-2">
                    {result.recommendations.map((rec, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg">
                        <div className="font-medium text-sm">{rec.action}</div>
                        <div className="text-sm text-muted-foreground">{rec.rationale}</div>
                        <div className="text-xs text-muted-foreground mt-1">Confidence: {rec.confidence}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Event ID: {result.eventId} | Timestamp: {new Date(result.timestamp).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
