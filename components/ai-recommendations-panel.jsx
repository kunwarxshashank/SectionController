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
      <Card className="h-full rounded-none border-0 bg-transparent shadow-none">
        <CardHeader className="pb-3 bg-gradient-to-r from-[color:var(--irctc-blue)]/10 to-transparent border-b border-[color:var(--irctc-blue)]/20">
          <CardTitle className="flex items-center gap-2 text-[color:var(--irctc-blue)]">
            <div className="p-1.5 rounded-lg bg-[color:var(--irctc-blue)]/10">
              <Brain className="h-5 w-5" />
            </div>
            <span className="font-bold">AI Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32">
            <div className="inline-block h-8 w-8 border-4 border-[color:var(--irctc-blue)]/20 border-t-[color:var(--irctc-blue)] rounded-full animate-spin mb-2"></div>
            <p className="text-sm text-muted-foreground">Analyzing network...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full rounded-none border-0 bg-transparent shadow-none">
      <CardHeader className="pb-3 bg-gradient-to-r from-[color:var(--irctc-blue)]/10 to-transparent border-b border-[color:var(--irctc-blue)]/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[color:var(--irctc-blue)]">
            <div className="p-1.5 rounded-lg bg-[color:var(--irctc-blue)]/10">
              <Brain className="h-5 w-5" />
            </div>
            <span className="font-bold">AI Recommendations</span>
            {recommendations.length > 0 && (
              <Badge variant="outline" className="ml-2 bg-[oklch(0.7_0.2_150)]/10 text-[oklch(0.7_0.2_150)] border-[oklch(0.7_0.2_150)]/30 text-xs">
                {recommendations.length}
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchRecommendations} 
            className="h-8 w-8 p-0 hover:bg-[color:var(--irctc-blue)]/10 rounded-lg"
          >
            <RefreshCw className="h-4 w-4 text-[color:var(--irctc-blue)]" />
          </Button>
        </div>
        {recommendations.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {recommendations.length} active recommendation{recommendations.length !== 1 ? "s" : ""}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto p-4">
        {error && (
          <Alert variant="destructive" className="border-2 border-[oklch(0.6_0.23_25)]/30 bg-[oklch(0.6_0.23_25)]/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-3 rounded-full bg-[color:var(--irctc-blue)]/10 w-fit mx-auto mb-4">
              <Brain className="h-10 w-10 mx-auto text-[color:var(--irctc-blue)] opacity-70" />
            </div>
            <p className="text-foreground font-medium">No active recommendations</p>
            <p className="text-xs text-muted-foreground mt-1">AI is monitoring the network</p>
          </div>
        ) : (
          recommendations.map((rec) => (
            <div key={rec.id} className="p-4 bg-gradient-to-br from-card to-card/95 rounded-xl border-2 border-[color:var(--irctc-blue)]/20 shadow-md hover:shadow-lg hover:border-[color:var(--irctc-blue)]/40 transition-all duration-200 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[color:var(--irctc-blue)]/10">
                    {getActionIcon(rec.action)}
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">{rec.actionType}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs font-semibold border-2 ${getUrgencyColor(rec.urgency)}`}>
                    {rec.urgency}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-2">
                    <span className={getConfidenceColor(rec.confidence)}>{rec.confidence}%</span>
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-foreground leading-relaxed">{rec.rationale}</p>

                <div className="flex items-center justify-between text-xs bg-gradient-to-r from-[color:var(--irctc-blue)]/5 to-transparent p-2 rounded-lg border border-[color:var(--irctc-blue)]/10">
                  <span className="text-muted-foreground">
                    Location: <span className="font-semibold text-foreground">{rec.location}</span>
                  </span>
                  <span className="text-[oklch(0.7_0.2_150)] font-bold">{rec.estimatedBenefit}</span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground font-medium">Affected trains:</span>
                  <div className="flex flex-wrap gap-1">
                    {rec.affectedTrains.map((trainId) => (
                      <Badge key={trainId} variant="secondary" className="text-xs bg-[color:var(--irctc-blue)]/10 text-[color:var(--irctc-blue)] border-[color:var(--irctc-blue)]/20">
                        {trainId}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {showNotesFor === rec.id && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add notes (optional)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-sm border-2 border-[color:var(--irctc-blue)]/20 focus:border-[color:var(--irctc-blue)]/50"
                    rows={2}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Button
                  size="sm"
                  onClick={() => handleDecision(rec.id, "accepted")}
                  disabled={processingId === rec.id}
                  className="flex items-center gap-1 text-xs h-8 bg-[oklch(0.7_0.2_150)] hover:bg-[oklch(0.7_0.2_150)]/90 text-white border-0 shadow-sm"
                >
                  <CheckCircle className="h-3 w-3" />
                  Accept
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDecision(rec.id, "overridden")}
                  disabled={processingId === rec.id}
                  className="flex items-center gap-1 text-xs h-8 bg-[oklch(0.71_0.2_50)]/10 hover:bg-[oklch(0.71_0.2_50)]/20 text-[oklch(0.71_0.2_50)] border border-[oklch(0.71_0.2_50)]/30"
                >
                  <Edit3 className="h-3 w-3" />
                  Override
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDecision(rec.id, "rejected")}
                  disabled={processingId === rec.id}
                  className="flex items-center gap-1 text-xs h-8 border-2 border-[oklch(0.6_0.23_25)]/30 hover:bg-[oklch(0.6_0.23_25)]/10 text-[oklch(0.6_0.23_25)]"
                >
                  <XCircle className="h-3 w-3" />
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
