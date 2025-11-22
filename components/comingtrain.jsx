"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useSectionRealtime } from "@/hooks/use-section-realtime"
import { normalizeSectionSchedule } from "@/lib/utils/section-trains"

export default function UpcomingTrainsPanel() {
    const { user } = useAuth()
    const sectionId = user?.username?.toLowerCase()

    const [searchTerm, setSearchTerm] = useState("")
    const [typeFilter, setTypeFilter] = useState("all")
    const [priorityFilter, setPriorityFilter] = useState("all")
    const {
        data: realtimeSection,
        error: realtimeError,
        isLoading,
    } = useSectionRealtime(sectionId, { enabled: Boolean(sectionId) })

    const trains = useMemo(() => normalizeSectionSchedule(realtimeSection?.schedule || []), [realtimeSection])

    const getISTMinutes = () => {
        const now = new Date()
        const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
        return ist.getHours() * 60 + ist.getMinutes()
    }

    const filteredTrains = useMemo(() => {
        const nowMinutes = getISTMinutes()
        return trains
            .map((train) => ({
                ...train,
                etaDifference: train.scheduledMinutes - nowMinutes,
            }))
            .filter((train) => {
                if (searchTerm && !train.name.toLowerCase().includes(searchTerm.toLowerCase()) && !train.id.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return false
                }
                if (typeFilter !== "all" && train.type !== typeFilter) {
                    return false
                }
                if (priorityFilter !== "all" && train.priorityLevel !== priorityFilter) {
                    return false
                }
                return true
            })
            .sort((a, b) => a.scheduledMinutes - b.scheduledMinutes)
    }, [trains, searchTerm, typeFilter, priorityFilter])

    const etaLabel = (train) => {
        if (!Number.isFinite(train.scheduledMinutes)) return "N/A"
        if (train.etaDifference >= 0) {
            return `${Math.round(train.etaDifference)} min`
        }
        return `${Math.abs(Math.round(train.etaDifference))} min ago`
    }

    const errorMessage = realtimeError || (!sectionId ? "No section assigned to this admin." : "")

    return (
        <Card className="h-full rounded-none border-0 bg-transparent shadow-none">
            <CardHeader className="pb-3 bg-gradient-to-r from-[color:var(--irctc-blue)]/10 to-transparent border-b border-[color:var(--irctc-blue)]/20">
                <CardTitle className="flex items-center gap-2 text-[color:var(--irctc-blue)]">
                    <div className="p-1.5 rounded-lg bg-[color:var(--irctc-blue)]/10">
                        <Clock className="h-5 w-5" />
                    </div>
                    <span className="font-bold">Active Trains</span>
                    {filteredTrains.length > 0 && (
                        <Badge variant="outline" className="ml-auto bg-[oklch(0.7_0.2_150)]/10 text-[oklch(0.7_0.2_150)] border-[oklch(0.7_0.2_150)]/30 text-xs">
                            {filteredTrains.length}
                        </Badge>
                    )}
                </CardTitle>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <input
                        type="text"
                        placeholder="Search train..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 min-w-[140px] rounded-lg border border-[color:var(--irctc-blue)]/20 bg-background/50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[color:var(--irctc-blue)]/30 focus:border-[color:var(--irctc-blue)]/50"
                    />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded-lg border border-[color:var(--irctc-blue)]/20 bg-background/50 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[color:var(--irctc-blue)]/30"
                    >
                        <option value="all">All Types</option>
                        <option value="superfast">Superfast</option>
                        <option value="express">Express</option>
                        <option value="local">Local</option>
                        <option value="freight">Freight</option>
                        <option value="relief">Relief</option>
                    </select>
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="rounded-lg border border-[color:var(--irctc-blue)]/20 bg-background/50 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[color:var(--irctc-blue)]/30"
                    >
                        <option value="all">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </CardHeader>

            <CardContent className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto p-4">
                {errorMessage && (
                    <div className="text-[oklch(0.6_0.23_25)] text-xs text-center bg-[oklch(0.6_0.23_25)]/10 p-2 rounded-lg border border-[oklch(0.6_0.23_25)]/20">{errorMessage}</div>
                )}

                {isLoading ? (
                    <div className="text-center py-8">
                        <div className="inline-block h-8 w-8 border-4 border-[color:var(--irctc-blue)]/20 border-t-[color:var(--irctc-blue)] rounded-full animate-spin mb-2"></div>
                        <p className="text-sm text-muted-foreground">Loading trains...</p>
                    </div>
                ) : filteredTrains.length === 0 ? (
                    <div className="text-center py-8">
                        <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground font-medium">No active trains</p>
                        <p className="text-xs text-muted-foreground mt-1">Waiting for train data...</p>
                    </div>
                ) : (
                    filteredTrains.map((train) => (
                        <div
                            key={train.id}
                            className="p-3.5 bg-gradient-to-br from-card to-card/95 rounded-xl border-2 border-[color:var(--irctc-blue)]/20 shadow-md hover:shadow-lg hover:border-[color:var(--irctc-blue)]/40 transition-all duration-200 space-y-2"
                        >
                            {/* Top badges */}
                            <div className="flex justify-between items-center">
                                <Badge
                                    variant="outline"
                                    className="bg-gradient-to-r from-[oklch(0.71_0.2_50)]/15 to-[oklch(0.71_0.2_50)]/10 text-[oklch(0.71_0.2_50)] text-[10px] px-2 py-0.5 capitalize font-semibold border-[oklch(0.71_0.2_50)]/30"
                                >
                                    {train.type}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] px-2 py-0.5 font-semibold ${
                                        train.delayStatus === "delayed" || train.delayMinutes > 0
                                            ? "bg-gradient-to-r from-[oklch(0.82_0.16_90)]/20 to-[oklch(0.82_0.16_90)]/10 text-[oklch(0.82_0.16_90)] border-[oklch(0.82_0.16_90)]/30"
                                            : "bg-gradient-to-r from-[oklch(0.7_0.2_150)]/20 to-[oklch(0.7_0.2_150)]/10 text-[oklch(0.7_0.2_150)] border-[oklch(0.7_0.2_150)]/30"
                                    }`}
                                >
                                    {train.delayStatus === "delayed" || train.delayMinutes > 0
                                        ? `+${train.delayMinutes}m`
                                        : train.delayStatus === "super_priority"
                                            ? "Priority"
                                            : "On Time"}
                                </Badge>
                            </div>

                            {/* Train info */}
                            <div className="space-y-1">
                                <h4 className="font-bold text-[color:var(--irctc-blue)] text-sm leading-tight">
                                    {train.id}
                                </h4>
                                <p className="text-xs font-semibold text-foreground leading-tight">{train.name}</p>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <span className="px-1.5 py-0.5 bg-[color:var(--irctc-blue)]/10 rounded text-[color:var(--irctc-blue)] font-medium">
                                        P{train.platform || "--"}
                                    </span>
                                    <span>•</span>
                                    <span>Priority {train.priorityScore ?? "--"}</span>
                                    <span>•</span>
                                    <span>{train.passengerCount || 0} pax</span>
                                </div>
                            </div>

                            {/* ETA */}
                            <div className="flex items-center justify-between text-xs bg-gradient-to-r from-[color:var(--irctc-blue)]/5 to-transparent p-2 rounded-lg border border-[color:var(--irctc-blue)]/10">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span className="font-medium">Sched: {train.scheduledArrival || "--"}</span>
                                </div>
                                <span className="font-bold text-[color:var(--irctc-blue)]">{etaLabel(train)}</span>
                            </div>

                            {train.delayReason && (
                                <div className="text-[10px] text-muted-foreground bg-muted/50 p-1.5 rounded border border-border/50">
                                    <span className="font-semibold">Delay:</span> {train.delayReason}
                                </div>
                            )}

                            {(train.isEmergency || train.hasCriticalCargo) && (
                                <div className="text-[10px] font-semibold text-[oklch(0.6_0.23_25)] bg-[oklch(0.6_0.23_25)]/10 p-1.5 rounded border border-[oklch(0.6_0.23_25)]/20">
                                    {train.isEmergency && "🚨 Emergency clearance required"}
                                    {train.isEmergency && train.hasCriticalCargo && " • "}
                                    {train.hasCriticalCargo && "📦 Critical cargo onboard"}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </CardContent>

        </Card>
    )
}
