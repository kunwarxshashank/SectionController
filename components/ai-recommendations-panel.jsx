"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Brain, Clock, TrendingUp, AlertTriangle, CheckCircle, XCircle, Edit3, RefreshCw } from "lucide-react"

export default function AIRecommendationsPanel() {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [showNotesFor, setShowNotesFor] = useState(null)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    fetchRecommendations()
    // Refresh recommendations every 30 seconds
    const interval = setInterval(fetchRecommendations, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchRecommendations = async () => {
    try {
      const response = await fetch("/api/ai/recommendations")
      if (response.ok) {
        const data = await response.json()
        setRecommendations(data.recommendations)
      } else {
        setError("Failed to fetch recommendations")
      }
    } catch (error) {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const handleDecision = async (recommendationId, decision) => {
    setProcessingId(recommendationId)
    setError("")

    try {
      const response = await fetch("/api/ai/decisions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recommendationId,
          decision,
          notes: showNotesFor === recommendationId ? notes : null,
        }),
      })

      if (response.ok) {
        // Remove the processed recommendation from the list
        setRecommendations((prev) => prev.filter((rec) => rec.id !== recommendationId))
        setShowNotesFor(null)
        setNotes("")
      } else {
        const data = await response.json()
        setError(data.error || "Failed to process decision")
      }
    } catch (error) {
      setError("Network error")
    } finally {
      setProcessingId(null)
    }
  }

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return "text-green-600"
    if (confidence >= 75) return "text-yellow-600"
    return "text-red-600"
  }

  const getActionIcon = (action) => {
    switch (action) {
      case "priority_adjustment":
        return <TrendingUp className="h-4 w-4" />
      case "route_optimization":
        return <RefreshCw className="h-4 w-4" />
      case "speed_adjustment":
        return <TrendingUp className="h-4 w-4" />
      case "hold_recommendation":
        return <Clock className="h-4 w-4" />
      default:
        return <Brain className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <Card className="h-full rounded-none border-0 bg-card/95">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-black" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full rounded-none border-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Recommendations
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchRecommendations} className="h-8 w-8 p-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {recommendations.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {recommendations.length} active recommendation{recommendations.length !== 1 ? "s" : ""}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-70" />
            <p className="text-foreground">No active recommendations</p>
            <p className="text-sm text-muted-foreground">AI is monitoring the network</p>
          </div>
        ) : (
          recommendations.map((rec) => (
            <div key={rec.id} className="p-4 bg-card rounded-lg border border-border space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getActionIcon(rec.action)}
                  <h4 className="font-medium text-sm">{rec.actionType}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${getUrgencyColor(rec.urgency)}`}>
                    {rec.urgency}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <span className={getConfidenceColor(rec.confidence)}>{rec.confidence}% confidence</span>
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-foreground">{rec.rationale}</p>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Location: <span className="font-medium">{rec.location}</span>
                  </span>
                  <span className="text-[oklch(0.7_0.2_150)] font-medium">{rec.estimatedBenefit}</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Affected trains:</span>
                  {rec.affectedTrains.map((trainId) => (
                    <Badge key={trainId} variant="secondary" className="text-xs">
                      {trainId}
                    </Badge>
                  ))}
                </div>
              </div>

              {showNotesFor === rec.id && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add notes (optional)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-sm"
                    rows={2}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleDecision(rec.id, "accepted")}
                  disabled={processingId === rec.id}
                  className="flex items-center gap-1 text-xs h-8"
                >
                  <CheckCircle className="h-3 w-3" />
                  Accept
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDecision(rec.id, "overridden")}
                  disabled={processingId === rec.id}
                  className="flex items-center gap-1 text-xs h-8"
                >
                  <Edit3 className="h-3 w-3" />
                  Override
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDecision(rec.id, "rejected")}
                  disabled={processingId === rec.id}
                  className="flex items-center gap-1 text-xs h-8"
                >
                  <XCircle className="h-3 w-3" />
                  Reject
                </Button>
                {/* <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNotesFor(showNotesFor === rec.id ? null : rec.id)
                    setNotes("")
                  }}
                  className="flex items-center gap-1 text-xs h-8"
                >
                  <Edit3 className="h-3 w-3" />
                  Notes
                </Button> */}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
