"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Play, RotateCcw, Beaker, TrendingUp, TrendingDown } from "lucide-react"

export default function SimulationSandbox() {
  const [scenarios, setScenarios] = useState([])
  const [runningScenario, setRunningScenario] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const predefinedScenarios = [
    {
      id: "rush_hour",
      name: "Rush Hour Congestion",
      description: "Simulate peak hour traffic with multiple delays",
      events: [
        { type: "delay", trainId: "T-401", severity: "medium", duration: 8 },
        { type: "delay", trainId: "T-205", severity: "low", duration: 3 },
        { type: "signal_failure", location: "Junction J-12", duration: 12 },
      ],
    },
    {
      id: "major_breakdown",
      name: "Major Train Breakdown",
      description: "Express train breakdown causing network disruption",
      events: [{ type: "breakdown", trainId: "T-401", severity: "high", duration: 45 }],
    },
    {
      id: "track_maintenance",
      name: "Emergency Track Maintenance",
      description: "Unscheduled maintenance affecting multiple routes",
      events: [
        { type: "track_maintenance", location: "Section B-C", duration: 30 },
        { type: "delay", trainId: "T-302", severity: "high", duration: 20 },
      ],
    },
  ]

  const runScenario = async (scenario) => {
    setLoading(true)
    setRunningScenario(scenario)
    setResults(null)

    try {
      const response = await fetch("/api/simulation/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scenarioId: scenario.id,
          events: scenario.events,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setResults(data)
      } else {
        console.error("Failed to run scenario")
      }
    } catch (error) {
      console.error("Error running scenario:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetSimulation = () => {
    setRunningScenario(null)
    setResults(null)
  }

  const getImpactColor = (impact) => {
    switch (impact) {
      case "positive":
        return "text-green-600"
      case "negative":
        return "text-red-600"
      case "neutral":
        return "text-gray-600"
      default:
        return "text-gray-600"
    }
  }

  const getImpactIcon = (impact) => {
    switch (impact) {
      case "positive":
        return TrendingUp
      case "negative":
        return TrendingDown
      default:
        return TrendingUp
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                Simulation Sandbox
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Run what-if scenarios to test system response and optimization strategies
              </p>
            </div>
            {runningScenario && (
              <Button variant="outline" onClick={resetSimulation}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!runningScenario ? (
            <div className="space-y-4">
              <h3 className="font-medium">Predefined Scenarios</h3>
              <div className="grid gap-4">
                {predefinedScenarios.map((scenario) => (
                  <div key={scenario.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{scenario.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{scenario.description}</p>
                        <div className="flex gap-2">
                          {scenario.events.map((event, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {event.type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        onClick={() => runScenario(scenario)}
                        disabled={loading}
                        className="flex items-center gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Run Scenario
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Running Scenario</Badge>
                <span className="font-medium">{runningScenario.name}</span>
              </div>

              {loading && (
                <Alert>
                  <Beaker className="h-4 w-4" />
                  <AlertDescription>Running simulation... This may take a few moments.</AlertDescription>
                </Alert>
              )}

              {results && (
                <div className="space-y-4">
                  <h3 className="font-medium">Simulation Results</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">Performance Impact</h4>
                        <div className="space-y-2">
                          {results.kpiImpact?.map((kpi, index) => {
                            const Icon = getImpactIcon(kpi.impact)
                            return (
                              <div key={index} className="flex items-center justify-between">
                                <span className="text-sm">{kpi.metric}</span>
                                <div className="flex items-center gap-1">
                                  <Icon className={`h-3 w-3 ${getImpactColor(kpi.impact)}`} />
                                  <span className={`text-sm ${getImpactColor(kpi.impact)}`}>{kpi.change}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">AI Recommendations</h4>
                        <div className="text-sm text-muted-foreground">
                          {results.recommendations?.length || 0} recommendations generated
                        </div>
                        {results.recommendations?.slice(0, 3).map((rec, index) => (
                          <div key={index} className="mt-2 p-2 bg-muted rounded text-xs">
                            <div className="font-medium">{rec.action}</div>
                            <div className="text-muted-foreground">Confidence: {rec.confidence}%</div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Summary</h4>
                      <p className="text-sm text-muted-foreground">
                        {results.summary ||
                          "Simulation completed successfully. Review the performance impact and AI recommendations above."}
                      </p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Simulation Duration: {results.duration}ms | Events Processed: {results.eventsProcessed}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
