"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useSectionData } from "@/hooks/useSectionData"

const DEFAULT_SECTION_ID = (process.env.NEXT_PUBLIC_DEFAULT_SECTION_ID || "bpl").toLowerCase()

export default function UpcomingTrainsPanel() {
    const { user } = useAuth()
    const preferredSection = user?.username?.toLowerCase()
    const sectionId = preferredSection || DEFAULT_SECTION_ID

    const [searchTerm, setSearchTerm] = useState("")
    const [typeFilter, setTypeFilter] = useState("all")
    const [priorityFilter, setPriorityFilter] = useState("all")
    const [timeFilter, setTimeFilter] = useState(6) // Default 6 hours

    // HOOK
    const {
        data: fullSection,
        trains: rawTrains,
        metadata,
        section: activeSection,
        wsError,
        isLoading
    } = useSectionData(sectionId)

    // Normalized trains (just map new fields)
    const trains = useMemo(() => {
        if (!rawTrains) return []

        return rawTrains.map((t) => {
            const delayMinutes =
                t.current_delay?.delay && !isNaN(Number(t.current_delay.delay))
                    ? Number(t.current_delay.delay)
                    : 0

            return {
                id: t.train_id,
                name: t.train_name,
                type: t.train_type?.toLowerCase(),
                platform: t.track || "--",
                scheduledArrival: t.scheduled_arrival,
                scheduledDeparture: t.scheduled_departure,
                actualArrival: t.actual_arrival,
                actualDeparture: t.actual_departure,
                direction: t.direction, // UP / DOWN
                passengerCount: t.passenger_count,
                status: t.status,
                delayMinutes,
                delayReason: t.current_delay?.delay_reason || "",
                delayStatus: t.current_delay?.delay_status || "",
                isEmergency: t.is_emergency,
                hasCriticalCargo: t.has_critical_cargo,
                priorityLevel: delayMinutes > 10 ? "high" : delayMinutes > 0 ? "medium" : "low"
            }
        })
    }, [rawTrains])

    const getISTMinutes = () => {
        const now = new Date()
        const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
        return ist.getHours() * 60 + ist.getMinutes()
    }

    const filteredTrains = useMemo(() => {
        const nowMinutes = getISTMinutes()
        const timeFilterMinutes = timeFilter * 60 // Convert hours to minutes

        return trains
            .map((train) => ({
                ...train,
                scheduledMinutes: convertToMinutes(train.scheduledArrival),
                etaDifference: convertToMinutes(train.scheduledArrival) - nowMinutes
            }))
            .filter((train) => {
                // Time filter: show only trains arriving within the selected time window
                if (!Number.isFinite(train.etaDifference)) {
                    return false
                }
                // Only show upcoming trains (etaDifference >= 0) within the time window
                if (train.etaDifference < 0 || train.etaDifference > timeFilterMinutes) {
                    return false
                }

                // Search filter
                if (
                    searchTerm &&
                    !train.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                    !train.id.toLowerCase().includes(searchTerm.toLowerCase())
                ) {
                    return false
                }

                // Type filter
                if (typeFilter !== "all" && train.type !== typeFilter) {
                    return false
                }

                // Priority filter
                if (priorityFilter !== "all" && train.priorityLevel !== priorityFilter) {
                    return false
                }

                return true
            })
            .sort((a, b) => a.scheduledMinutes - b.scheduledMinutes)
    }, [trains, searchTerm, typeFilter, priorityFilter, timeFilter])

    // Convert HH:MM -> minutes
    function convertToMinutes(timeStr) {
        if (!timeStr) return NaN
        const [h, m] = timeStr.split(":").map(Number)
        return h * 60 + m
    }

    const etaLabel = (train) => {
        if (!Number.isFinite(train.scheduledMinutes)) return "N/A"
        if (train.etaDifference >= 0) return `${Math.round(train.etaDifference)} min`
        return `${Math.abs(Math.round(train.etaDifference))} min ago`
    }

    const errorMessage = wsError
    const defaultSectionNotice = !preferredSection ? `No section assigned — showing ${activeSection?.toUpperCase() || DEFAULT_SECTION_ID.toUpperCase()}` : ""

    return (
        <Card className="h-full rounded-none border-0 bg-transparent shadow-none">
            <CardHeader className="pb-3 bg-gradient-to-r from-blue-600/10 to-transparent border-b border-blue-600/20">
                <CardTitle className="flex items-center gap-2 text-blue-700">
                    <div className="p-1.5 rounded-lg bg-blue-600/10">
                        <Clock className="h-5 w-5" />
                    </div>
                    <span className="font-bold">
                        Active Trains {metadata?.name ? `• ${metadata.name}` : ""}
                    </span>
                    {filteredTrains.length > 0 && (
                        <Badge variant="outline" className="ml-auto text-xs">
                            {filteredTrains.length}
                        </Badge>
                    )}
                </CardTitle>

                {/* Time Filter Buttons */}
                <div className="mt-3 flex flex-wrap gap-2">
                    {[3, 6, 12, 24].map((hours) => (
                        <button
                            key={hours}
                            onClick={() => setTimeFilter(hours)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${timeFilter === hours
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                }`}
                        >
                            {hours}hr
                        </button>
                    ))}
                </div>

                {/* Search + Filters */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <input
                        type="text"
                        placeholder="Search train..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 min-w-[140px] rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded-lg border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Types</option>
                        <option value="superfast">Superfast</option>
                        <option value="express">Express</option>
                        <option value="shatabdi">Shatabdi</option>
                    </select>

                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="rounded-lg border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <div className="text-red-600 text-xs text-center bg-red-600/10 p-2 rounded-lg border border-red-600/20">
                        {errorMessage}
                    </div>
                )}
                {!errorMessage && defaultSectionNotice && (
                    <div className="text-[color:var(--irctc-blue)] text-xs text-center bg-[color:var(--irctc-blue)]/10 p-2 rounded-lg border border-[color:var(--irctc-blue)]/20">
                        {defaultSectionNotice}
                    </div>
                )}

                {isLoading ? (
                    <div className="text-center py-8">Loading trains...</div>
                ) : filteredTrains.length === 0 ? (
                    <div className="text-center py-8">No active trains</div>
                ) : (
                    filteredTrains.map((train) => (
                        <div
                            key={train.id}
                            className="p-3.5 rounded-xl border shadow-sm hover:shadow-md transition-all space-y-2"
                        >
                            {/* Direction + Type */}
                            <div className="flex justify-between">
                                <Badge>{train.type}</Badge>
                                <Badge variant="outline">{train.direction}</Badge>
                            </div>

                            {/* Train Info */}
                            <h4 className="font-bold text-blue-700">{train.id}</h4>
                            <p className="text-xs font-semibold">{train.name}</p>

                            {/* Platform + Pax */}
                            <div className="flex items-center gap-2 text-[10px] text-gray-600">
                                <span className="px-1.5 py-0.5 bg-blue-600/10 rounded text-blue-700 font-medium">
                                    Track {train.platform}
                                </span>
                                <span>•</span>
                                <span>{train.passengerCount} pax</span>
                            </div>

                            {/* ETA */}
                            <div className="flex items-center justify-between text-xs bg-blue-600/5 p-2 rounded border">
                                <span>Sched: {train.scheduledArrival}</span>
                                <span className="font-bold text-blue-700">{etaLabel(train)}</span>
                            </div>

                            {/* Delay */}
                            {train.delayMinutes > 0 && (
                                <div className="text-[10px] text-orange-700 bg-orange-100 p-1 rounded">
                                    Delay: +{train.delayMinutes}m — {train.delayReason}
                                </div>
                            )}

                            {/* Emergency */}
                            {(train.isEmergency || train.hasCriticalCargo) && (
                                <div className="text-[10px] font-semibold text-red-700 bg-red-100 p-1 rounded">
                                    {train.isEmergency && "🚨 Emergency"}
                                    {train.isEmergency && train.hasCriticalCargo && " • "}
                                    {train.hasCriticalCargo && "📦 Critical Cargo"}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    )
}
