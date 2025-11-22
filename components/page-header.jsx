"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { Clock, AlertTriangle, LogOut, Train, Activity } from "lucide-react"
import IstClock from "@/components/dashboard/clock"
import NavigationMenu from "./navigation-menu"

export default function PageHeader({ 
  pageName, 
  icon: Icon = Train,
  actionButtons,
  showStats = true 
}) {
  const { logout } = useAuth()

  return (
    <header className="border-b-2 border-[color:var(--irctc-blue)]/20 bg-gradient-to-r from-[color:var(--irctc-blue)] via-[color:var(--irctc-blue)]/98 to-[oklch(0.16_0.03_260)] shadow-lg">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between text-primary-foreground">
          <div className="flex items-center gap-5">
            {/* Logo and Page Title */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg border-2 border-white/30 bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/90 font-bold">
                  भारतीय रेल • Indian Railways
                </span>
                <h1 className="text-xl font-bold leading-tight tracking-wide">
                  {pageName}
                </h1>
              </div>
            </div>

            {/* Section Name - Beautiful without border/background */}
            <div className="hidden md:flex items-center gap-2 text-sm text-white/95">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse shadow-lg shadow-emerald-300/50" />
              <span className="font-semibold tracking-wide">BHOPAL – ITARSI SECTION</span>
            </div>

            {/* Current Time - Beautiful without border/background */}
            <div className="hidden lg:flex items-center gap-2 text-sm text-white/95">
              <Clock className="h-4 w-4 " />
              <span className="font-medium">IST:</span>
              <span className="font-mono font-semibold tracking-wider">
                <IstClock />
              </span>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">

            {/* Running Stats - Live indicator */}
            {showStats && (
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />
                    <div className="relative h-2 w-2 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-xs font-bold text-emerald-200 tracking-wider uppercase">LIVE</span>
                </div>
              </div>
            )}


            {/* Active Alerts */}
            <div className="hidden md:flex items-center gap-2 rounded-lg bg-[oklch(0.6_0.23_25)]/20 backdrop-blur-sm border border-[oklch(0.6_0.23_25)]/30 px-3 py-1.5 text-xs">
              <AlertTriangle className="h-4 w-4 text-[oklch(0.6_0.23_25)]" />
              <span className="font-semibold text-white">2 Active Alerts</span>
            </div>

            {/* Page-specific Action Buttons */}
            {actionButtons && (
              <div className="flex gap-2">
                {actionButtons}
              </div>
            )}

            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="flex items-center gap-2 bg-[oklch(0.6_0.23_25)]/90 text-white border-[oklch(0.6_0.23_25)]/50 hover:bg-[oklch(0.6_0.23_25)] shadow-md"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <NavigationMenu />
    </header>
  )
}

