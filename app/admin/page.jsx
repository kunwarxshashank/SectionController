"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Train, PhoneCall, LogsIcon, TrainFront, CalendarClock, Codesandbox} from "lucide-react"
import { useRouter } from "next/navigation"
import TrainManagement from "@/components/admin/train-management"
import EventSimulation from "@/components/admin/event-simulation"
import Sandbox from "@/components/admin/simulation-sandbox"
import AuditLogs from "@/components/admin/audit-logs"

export default function AdminPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-[color:var(--irctc-blue)] via-[color:var(--irctc-blue)]/95 to-[oklch(0.16_0.03_260)] shadow-md py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full border border-white/20 bg-background/10 flex items-center justify-center">
              <Train className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-wide">
                Admin Control Console
              </h1>
              <p className="text-xs text-white/80">Train operations configuration &amp; simulations</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/")}
            className="flex items-center gap-2 bg-white/10 text-primary-foreground border-white/30 hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-card/95 shadow-xl rounded-xl p-6 border border-border">
          <Tabs defaultValue="trains" className="space-y-8">
            {/* Tab Navigation */}
            <TabsList className="grid w-full grid-cols-5 rounded-lg border bg-muted/60">
              <TabsTrigger
                value="trains"
                className="data-[state=active]:bg-[var(--irctc-blue)] data-[state=active]:text-white"
              >
                <TrainFront/>
                Train Management
              </TabsTrigger>
              <TabsTrigger
                value="events"
                className="data-[state=active]:bg-[var(--irctc-blue)] data-[state=active]:text-white"
              >
                <CalendarClock/>
                Event Simulation
              </TabsTrigger>
              <TabsTrigger
                value="sandbox"
                className="data-[state=active]:bg-[var(--irctc-blue)] data-[state=active]:text-white"
              >
                <Codesandbox/>
                Simulation Sandbox
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                className="data-[state=active]:bg-[var(--irctc-blue)] data-[state=active]:text-white"
              >
                <LogsIcon/>
                Audit Logs
              </TabsTrigger>

              <TabsTrigger
                value="helpline"
                className="data-[state=active]:bg-[var(--irctc-blue)] data-[state=active]:text-white"
              >
                <PhoneCall/>
                HelpLine
              </TabsTrigger>

            </TabsList>

            {/* Tab Content */}
            <div className="mt-6">
              <TabsContent value="trains">
                <div className="p-6 rounded-lg border bg-card/80">
                  <TrainManagement />
                </div>
              </TabsContent>

              <TabsContent value="events">
                <div className="p-6 rounded-lg border bg-card/80">
                  <EventSimulation />
                </div>
              </TabsContent>

              <TabsContent value="sandbox">
                <div className="p-6 rounded-lg border bg-card/80">
                  <Sandbox />
                </div>
              </TabsContent>

              <TabsContent value="audit">
                <div className="p-6 rounded-lg border bg-card/80">
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
