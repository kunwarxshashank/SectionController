"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

export default function UpcomingTrainsPanel() {
    const { user } = useAuth()
    const sectionId = user?.username?.toLowerCase()

    const [trains, setTrains] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [searchTerm, setSearchTerm] = useState("")
    const [typeFilter, setTypeFilter] = useState("all")
    const [priorityFilter, setPriorityFilter] = useState("all")

    useEffect(() => {
        let interval
        if (sectionId) {
            fetchTrains(sectionId)
            interval = setInterval(() => fetchTrains(sectionId), 30000)
        } else {
            setLoading(false)
            setError("No section assigned to this admin.")
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [sectionId])

    const fetchTrains = async (id) => {
        setLoading(true)
        setError("")

        try {
            const response = await fetch(`/api/sections/${id}`)
            if (!response.ok) {
                throw new Error("Failed to fetch section schedule")
            }

            const data = await response.json()
            const normalized = (data.schedule || []).map((train) => ({
                id: train.trainId,
                name: train.trainName,
                type: train.trainType,
                scheduledArrival: train.scheduled_arrival,
                scheduledDeparture: train.scheduled_departure,
                platform: train.platform,
                priority: train.base_priority,
                passengerCount: train.passenger_count,
                delayStatus: train.current_delay?.delay_status,
                delayMinutes: train.current_delay?.delay ?? 0,
                delayReason: train.current_delay?.delay_reason,
                isEmergency: train.is_emergency,
                hasCriticalCargo: train.has_critical_cargo,
                scheduledMinutes: parseTimeToMinutes(train.scheduled_arrival),
            }))

            setTrains(normalized)
        } catch (err) {
            console.error("Error fetching trains:", err)
            setError(err.message || "Network error")
            setTrains([])
        } finally {
            setLoading(false)
        }
    }

    const parseTimeToMinutes = (timeStr) => {
        if (!timeStr || timeStr === "—") return Number.POSITIVE_INFINITY
        const [hours, minutes] = timeStr.split(":").map(Number)
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.POSITIVE_INFINITY
        return hours * 60 + minutes
    }

    const getISTMinutes = () => {
        const now = new Date()
        const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
        return ist.getHours() * 60 + ist.getMinutes()
    }

    const classifyPriority = (value) => {
        if (value >= 8) return "high"
        if (value >= 5) return "medium"
        return "low"
    }

    const filteredTrains = useMemo(() => {
        const nowMinutes = getISTMinutes()
        return trains
            .map((train) => ({
                ...train,
                etaDifference: train.scheduledMinutes - nowMinutes,
                priorityLevel: classifyPriority(train.priority || 0),
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

    return (
        <Card className="h-full rounded-none border-0">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Active Trains
                </CardTitle>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <input
                        type="text"
                        placeholder="Search train..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 min-w-[140px] rounded-md border px-2 py-1"
                    />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded-md border px-2 py-1"
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
                        className="rounded-md border px-2 py-1"
                    >
                        <option value="all">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
                {filteredTrains.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">{filteredTrains.length} trains tracked</p>
                )}
            </CardHeader>

            <CardContent className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto">
                {error && (
                    <div className="text-[oklch(0.6_0.23_25)] text-xs text-center">{error}</div>
                )}

                {loading ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">Loading trains...</div>
                ) : filteredTrains.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground opacity-70">
                        No active trains
                    </div>
                ) : (
                    filteredTrains.map((train) => (
                        <div
                            key={train.id}
                            className="p-3 bg-card rounded-md border border-border space-y-1.5"
                        >
                            {/* Top badges */}
                            <div className="flex justify-between items-center">
                                <Badge
                                    variant="outline"
                                    className="bg-[oklch(0.71_0.2_50)/0.1] text-[oklch(0.71_0.2_50)] text-[10px] px-1.5 py-0.5 capitalize"
                                >
                                    {train.type}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0.5 ${train.delayStatus === "delayed" || train.delayMinutes > 0
                                            ? "bg-[oklch(0.82_0.16_90)/0.2] text-[oklch(0.82_0.16_90)]"
                                            : "bg-[oklch(0.7_0.2_150)/0.15] text-[oklch(0.7_0.2_150)]"
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
                            <div>
                                <h4 className="font-semibold text-[color:var(--irctc-blue)] text-sm leading-tight">
                                    {train.id}
                                </h4>
                                <p className="text-xs font-semibold text-[color:var(--irctc-blue)] leading-tight">{train.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                    Platform {train.platform || "--"} • Priority {train.priority || "--"} • Passengers {train.passengerCount || 0}
                                </p>
                            </div>

                            {/* ETA */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Sched: {train.scheduledArrival || "--"}</span>
                                </div>
                                <span className="font-bold text-[color:var(--irctc-blue)]">{etaLabel(train)}</span>
                            </div>

                            {train.delayReason && (
                                <p className="text-[10px] text-muted-foreground">
                                    {train.delayReason}
                                </p>
                            )}

                            {(train.isEmergency || train.hasCriticalCargo) && (
                                <div className="text-[10px] font-semibold text-[oklch(0.6_0.23_25)]">
                                    {train.isEmergency && "Emergency clearance required"}
                                    {train.isEmergency && train.hasCriticalCargo && " • "}
                                    {train.hasCriticalCargo && "Critical cargo onboard"}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </CardContent>

        </Card>
    )
}
