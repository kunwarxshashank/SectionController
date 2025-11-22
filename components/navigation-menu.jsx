"use client"

import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from "next/navigation"
import { Home, FileText, Phone, Shield } from "lucide-react"

const navItems = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "reports", label: "Reports", icon: FileText, path: "/reports" },
  { id: "broadcast", label: "Broadcast", icon: Phone, path: "/broadcast" },
  { id: "admin", label: "Admin", icon: Shield, path: "/admin" },
]

export default function NavigationMenu() {
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (path) => {
    if (path === "/") return pathname === "/"
    return pathname?.startsWith(path)
  }

  return (
    <nav className="relative bg-gradient-to-r from-[oklch(0.18_0.03_260)] via-[oklch(0.16_0.03_260)] to-[oklch(0.18_0.03_260)] border-t border-white/10 shadow-inner backdrop-blur-sm">
      <div className="px-6 py-1">
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <div key={item.id} className="relative">
                <Button
                  variant="ghost"
                  onClick={() => router.push(item.path)}
                  className={`relative flex items-center gap-2.5 px-5 py-3 rounded-t-xl transition-all duration-300 ease-in-out group ${
                    active
                      ? "bg-gradient-to-b from-[color:var(--irctc-blue)] via-[color:var(--irctc-blue)]/95 to-[oklch(0.18_0.03_260)] text-white shadow-xl border-t-2 border-[color:var(--irctc-blue)] transform translate-y-[-2px] ring-2 ring-[color:var(--irctc-blue)]/30 ring-inset"
                      : "text-white/60 hover:text-white/90 hover:bg-white/5 hover:translate-y-[-1px]"
                  }`}
                >
                  {/* Active indicator dot */}
                  {active && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[color:var(--irctc-blue)] shadow-lg shadow-[color:var(--irctc-blue)]/60 animate-pulse ring-2 ring-[color:var(--irctc-blue)]/40" />
                    </div>
                  )}
                  
                  {/* Icon with enhanced styling */}
                  <div className={`relative ${active ? "scale-110" : "group-hover:scale-105"} transition-transform duration-300`}>
                    <Icon className={`h-5 w-5 ${active ? "text-white drop-shadow-lg" : "text-white/70 group-hover:text-white"}`} />
                    {active && (
                      <div className="absolute inset-0 bg-white/20 rounded-full blur-sm" />
                    )}
                  </div>
                  
                  {/* Label with enhanced typography */}
                  <span className={`font-semibold text-sm tracking-wide ${
                    active 
                      ? "text-white drop-shadow-md" 
                      : "text-white/70 group-hover:text-white"
                  }`}>
                    {item.label}
                  </span>
                  
                  {/* Active bottom border accent - single blue color */}
                  {active && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[color:var(--irctc-blue)] rounded-full" />
                  )}
                  
                  {/* Hover effect glow */}
                  {!active && (
                    <div className="absolute inset-0 rounded-t-xl bg-gradient-to-b from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  )}
                </Button>
                
                {/* Active tab bottom highlight */}
                {active && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[color:var(--irctc-blue)]/40 to-transparent" />
                )}
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Subtle bottom border for nav */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </nav>
  )
}

