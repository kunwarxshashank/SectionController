"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Brain, Clock, TrendingUp, AlertTriangle, CheckCircle, XCircle, Edit3, RefreshCw } from "lucide-react"
import { useRecommendation } from "@/hooks/useRecommendation"

export default function AIRecommendationsPanel() {
  const { recommendations: socketRecommendations, wsError, isLoading } = useRecommendation()
  const [recommendations, setRecommendations] = useState([])
  const [processingId, setProcessingId] = useState(null)
  const [showNotesFor, setShowNotesFor] = useState(null)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")

  // Update recommendations when socket data changes
  useEffect(() => {
    if (socketRecommendations && socketRecommendations.length > 0) {
      setRecommendations(socketRecommendations)
      // Clear error when data is received successfully
      setError("")
    }
  }, [socketRecommendations])

  // Show WebSocket errors only if no data is available
  useEffect(() => {
    if (wsError && recommendations.length === 0) {
      setError(wsError)
    } else if (!wsError) {
      setError("")
    }
  }, [wsError, recommendations.length])

  const handleRefresh = () => {
    // Force reconnect or manual refresh logic could go here
    window.location.reload()
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

  if (isLoading) {
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
            onClick={handleRefresh}
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
            <div
              key={rec.id || rec.train_id}
              className="group relative overflow-hidden p-4 bg-gradient-to-br from-card via-card/98 to-[color:var(--irctc-blue)]/5 rounded-xl border border-[color:var(--irctc-blue)]/30 shadow-md hover:shadow-lg hover:border-[color:var(--irctc-blue)]/50 transition-all duration-200 space-y-3"
            >
              {/* Railway Track Accent - Top */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[color:var(--irctc-blue)] to-transparent opacity-50"></div>

              {/* Station Board Style Header - Train ID, Name, and Priority */}
              <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-dashed border-[color:var(--irctc-blue)]/20">
                {/* Train Information Section */}
                <div className="flex items-center gap-2.5 flex-1">
                  {rec.train_id && (
                    <Badge
                      variant="secondary"
                      className="px-2.5 py-1 bg-gradient-to-br from-[color:var(--irctc-blue)] to-[color:var(--irctc-blue)]/80 text-white border border-[color:var(--irctc-blue)]/40 font-mono text-xs font-bold shadow-sm"
                    >
                      #{rec.train_id}
                    </Badge>
                  )}
                  {rec.train_name && (
                    <span className="font-semibold text-sm text-foreground">
                      {rec.train_name}
                    </span>
                  )}
                </div>

                {/* Priority Badge */}
                {rec.priority && (
                  <Badge
                    variant="outline"
                    className="px-2.5 py-0.5 text-xs font-semibold uppercase bg-gradient-to-br from-[oklch(0.71_0.2_50)]/15 to-[oklch(0.6_0.23_25)]/15 text-[oklch(0.71_0.2_50)] border border-[oklch(0.71_0.2_50)]/40 shadow-sm"
                  >
                    {rec.priority}
                  </Badge>
                )}
              </div>

              {/* Action Type Indicator */}
              {rec.action_type && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-[color:var(--irctc-blue)]/8 to-transparent rounded-md border-l-2 border-[color:var(--irctc-blue)]/60">
                  <div className="p-1 bg-[color:var(--irctc-blue)]/10 rounded">
                    {getActionIcon(rec.action_type)}
                  </div>
                  <span className="text-xs font-medium text-[color:var(--irctc-blue)] uppercase">
                    {rec.action_type.replace(/_/g, ' ')}
                  </span>
                </div>
              )}

              {/* Description */}
              {(rec.description || rec.rationale) && (
                <div className="space-y-1.5">
                  {rec.description && (
                    <p className="text-xs text-foreground leading-relaxed">
                      {rec.description}
                    </p>
                  )}
                  {rec.rationale && (
                    <p className="text-xs text-muted-foreground leading-relaxed italic border-l border-[color:var(--irctc-blue)]/30 pl-2">
                      {rec.rationale}
                    </p>
                  )}
                </div>
              )}

              {/* Railway Metrics Display - Compact Single Line */}
              <div className="flex items-center gap-3 flex-wrap text-xs">
                {(rec.current_delay?.delay_status || rec.delay_status) && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="text-xs h-5 px-1.5 bg-[oklch(0.71_0.2_50)]/10 text-[oklch(0.71_0.2_50)] border-[oklch(0.71_0.2_50)]/30">
                      {rec.current_delay?.delay_status || rec.delay_status}
                    </Badge>
                  </div>
                )}

                {(rec.current_delay?.delay || rec.delay) && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Delay:</span>
                    <span className="font-semibold text-[oklch(0.6_0.23_25)]">{rec.current_delay?.delay || rec.delay}</span>
                  </div>
                )}

                {rec.confidence && (
                  <div className="flex items-center gap-1.5">
                    <Brain className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Confidence:</span>
                    <span className={`font-semibold ${getConfidenceColor(rec.confidence)}`}>{rec.confidence}%</span>
                  </div>
                )}
              </div>

              {/* Additional Information */}
              {(rec.location || (rec.affectedTrains && rec.affectedTrains.length > 0)) && (
                <div className="space-y-1.5">
                  {rec.location && (
                    <div className="flex items-center justify-between text-xs bg-[color:var(--irctc-blue)]/5 p-2 rounded border-l-2 border-[color:var(--irctc-blue)]/50">
                      <span className="text-muted-foreground">
                        📍 <span className="font-medium text-foreground">{rec.location}</span>
                      </span>
                      {rec.estimatedBenefit && (
                        <span className="text-[oklch(0.7_0.2_150)] font-medium flex items-center gap-1">
                          <TrendingUp className="h-2.5 w-2.5" />
                          {rec.estimatedBenefit}
                        </span>
                      )}
                    </div>
                  )}

                  {rec.affectedTrains && rec.affectedTrains.length > 0 && (
                    <div className="flex items-start gap-1.5 text-xs p-2 bg-muted/30 rounded border border-border/50">
                      <span className="text-muted-foreground font-medium">🚂</span>
                      <div className="flex flex-wrap gap-1">
                        {rec.affectedTrains.map((trainId) => (
                          <Badge
                            key={trainId}
                            variant="secondary"
                            className="text-xs h-5 px-1.5 bg-[color:var(--irctc-blue)]/12 text-[color:var(--irctc-blue)] border-[color:var(--irctc-blue)]/30 font-mono"
                          >
                            #{trainId}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes Section */}
              {showNotesFor === rec.id && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <Textarea
                    placeholder="Add notes (optional)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-xs border border-[color:var(--irctc-blue)]/30 focus:border-[color:var(--irctc-blue)]/60 rounded"
                    rows={2}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-1.5 pt-2 border-t border-border/30">
                <Button
                  size="sm"
                  onClick={() => handleDecision(rec.id, "accepted")}
                  disabled={processingId === rec.id}
                  className="flex items-center gap-1 text-xs h-8 px-3 bg-[oklch(0.7_0.2_150)] hover:bg-[oklch(0.65_0.2_150)] text-white border-0 shadow-sm font-medium transition-colors"
                >
                  <CheckCircle className="h-3 w-3" />
                  Accept
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDecision(rec.id, "overridden")}
                  disabled={processingId === rec.id}
                  className="flex items-center gap-1 text-xs h-8 px-3 bg-[oklch(0.71_0.2_50)]/10 hover:bg-[oklch(0.71_0.2_50)]/20 text-[oklch(0.71_0.2_50)] border border-[oklch(0.71_0.2_50)]/30 font-medium transition-colors"
                >
                  <Edit3 className="h-3 w-3" />
                  Override
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDecision(rec.id, "rejected")}
                  disabled={processingId === rec.id}
                  className="flex items-center gap-1 text-xs h-8 px-3 border border-[oklch(0.6_0.23_25)]/30 hover:bg-[oklch(0.6_0.23_25)]/10 text-[oklch(0.6_0.23_25)] font-medium transition-colors"
                >
                  <XCircle className="h-3 w-3" />
                  Reject
                </Button>
              </div>

              {/* Railway Track Decoration - Bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[color:var(--irctc-blue)]/30 to-transparent"></div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
