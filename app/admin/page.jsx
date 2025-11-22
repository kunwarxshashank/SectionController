"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Train, PhoneCall, LogsIcon, TrainFront, CalendarClock, Codesandbox, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import TrainManagement from "@/components/admin/train-management"
import EventSimulation from "@/components/admin/event-simulation"
import Sandbox from "@/components/admin/simulation-sandbox"
import AuditLogs from "@/components/admin/audit-logs"
import PageHeader from "@/components/page-header"

export default function AdminPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.99_0.01_95)] via-[oklch(0.985_0.015_95)] to-[oklch(0.98_0.02_95)]">
      {/* Header */}
      <PageHeader 
        pageName="Admin Control Console" 
        icon={Shield}
        showStats={true}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-gradient-to-br from-card to-card/95 shadow-xl rounded-xl p-6 border-2 border-[color:var(--irctc-blue)]/20">
          <Tabs defaultValue="trains" className="space-y-6">
            {/* Tab Navigation */}
            <TabsList className="grid w-full grid-cols-5 rounded-lg border-2 border-[color:var(--irctc-blue)]/20 bg-gradient-to-r from-muted/80 to-muted/60 p-1">
              <TabsTrigger
                value="trains"
                className="data-[state=active]:bg-[color:var(--irctc-blue)] data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all"
              >
                <TrainFront className="h-4 w-4 mr-2"/>
                Train Management
              </TabsTrigger>
              <TabsTrigger
                value="events"
                className="data-[state=active]:bg-[color:var(--irctc-blue)] data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all"
              >
                <CalendarClock className="h-4 w-4 mr-2"/>
                Event Simulation
              </TabsTrigger>
              <TabsTrigger
                value="sandbox"
                className="data-[state=active]:bg-[color:var(--irctc-blue)] data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all"
              >
                <Codesandbox className="h-4 w-4 mr-2"/>
                Simulation Sandbox
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                className="data-[state=active]:bg-[color:var(--irctc-blue)] data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all"
              >
                <LogsIcon className="h-4 w-4 mr-2"/>
                Audit Logs
              </TabsTrigger>
              <TabsTrigger
                value="helpline"
                className="data-[state=active]:bg-[color:var(--irctc-blue)] data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all"
              >
                <PhoneCall className="h-4 w-4 mr-2"/>
                HelpLine
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <div className="mt-6">
              <TabsContent value="trains">
                <div className="p-6 rounded-xl border-2 border-[color:var(--irctc-blue)]/10 bg-gradient-to-br from-card/95 to-card/90">
                  <TrainManagement />
                </div>
              </TabsContent>

              <TabsContent value="events">
                <div className="p-6 rounded-xl border-2 border-[color:var(--irctc-blue)]/10 bg-gradient-to-br from-card/95 to-card/90">
                  <EventSimulation />
                </div>
              </TabsContent>

              <TabsContent value="sandbox">
                <div className="p-6 rounded-xl border-2 border-[color:var(--irctc-blue)]/10 bg-gradient-to-br from-card/95 to-card/90">
                  <Sandbox />
                </div>
              </TabsContent>

              <TabsContent value="audit">
                <div className="p-6 rounded-xl border-2 border-[color:var(--irctc-blue)]/10 bg-gradient-to-br from-card/95 to-card/90">
                  <AuditLogs />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
