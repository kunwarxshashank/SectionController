"use client"
import { useAuth } from "@/components/auth-provider.jsx"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Train } from "lucide-react"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [progress, setProgress] = useState(0)
  
  useEffect(() => {
    if (!loading && !user) {
      console.log("[v0] HomePage: No user found, redirecting to login")
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setProgress(p => (p >= 100 ? 0 : p + 0.5))
      }, 50)
      return () => clearInterval(interval)
    }
  }, [loading])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center overflow-hidden relative bg-gradient-to-br from-[oklch(0.98_0.02_95)] via-background to-[oklch(0.95_0.02_260)]">
        <style>{`
          @keyframes trainMove {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes wheelSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
          @keyframes smoke {
            0% { opacity: 0.6; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-30px) scale(2); }
          }
          .train-animate {
            animation: trainMove 4s linear infinite;
          }
          .wheel-animate {
            animation: wheelSpin 0.15s linear infinite;
          }
          .shimmer-animate {
            animation: shimmer 2s linear infinite;
          }
          .float-animate {
            animation: float 0.3s ease-in-out infinite;
          }
          .smoke-animate {
            animation: smoke 1.5s ease-out infinite;
          }
        `}</style>

        {/* Background decorative elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -left-16 -top-24 h-64 w-64 rounded-full bg-[oklch(0.71_0.2_50)/0.15] blur-3xl animate-pulse" />
          <div className="absolute -right-10 bottom-0 h-56 w-56 rounded-full bg-[oklch(0.7_0.2_150)/0.12] blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Main Container */}
        <div className="relative z-10">
          {/* Glassmorphism Card */}
          <div 
            className="relative rounded-3xl p-8 w-full max-w-md mx-auto"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
            }}
          >
            {/* Header with Indian Railways branding */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, oklch(0.71_0.2_50) 0%, oklch(1_0_0) 50%, oklch(0.7_0.2_150) 100%)',
                  boxShadow: '0 4px 15px rgba(27, 4, 4, 0.3)'
                }}
              >
                <Train className="h-6 w-6 text-[color:var(--irctc-blue)]" />
                
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold text-[color:var(--irctc-blue)] tracking-wide">
                  भारतीय रेल
                </h1>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Indian Railways
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Train Section Controller
                </p>
              </div>
            </div>

            {/* Train Animation Area */}
            <div 
              className="relative h-40 rounded-2xl overflow-hidden mb-8"
              style={{
                background: 'linear-gradient(180deg, rgba(241,245,249,0.5) 0%, rgba(226,232,240,0.3) 100%)',
                border: '1px solid rgba(0,0,0,0.04)'
              }}
            >
              {/* Distant landscape silhouette */}
              <div className="absolute bottom-16 left-0 right-0 opacity-20">
                <svg viewBox="0 0 400 40" className="w-full" preserveAspectRatio="none">
                  <path d="M0,40 L0,30 Q20,20 40,28 Q60,15 80,25 Q120,10 160,22 Q200,8 240,20 Q280,12 320,24 Q360,18 400,26 L400,40 Z" fill="#64748b"/>
                </svg>
              </div>

              {/* Track bed */}
              <div className="absolute bottom-6 left-0 right-0 h-8">
                <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-stone-300/40 to-transparent rounded-t-full" />
              </div>
              
              {/* Rails */}
              <div className="absolute bottom-8 left-0 right-0">
                <div className="h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mb-1" />
                <div className="h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent" />
                {/* Rail shine */}
                <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden">
                  <div 
                    className="h-full w-1/4 bg-gradient-to-r from-transparent via-white to-transparent shimmer-animate"
                  />
                </div>
              </div>
              
              {/* Sleepers */}
              <div className="absolute bottom-7 left-0 right-0 flex justify-around px-2">
                {[...Array(24)].map((_, i) => (
                  <div key={i} className="w-1 h-4 bg-amber-900/30 rounded-sm" />
                ))}
              </div>

              {/* Train Container */}
              <div 
                className="absolute bottom-10 left-0 right-0 train-animate"
              >
                <div className="float-animate">
                  <svg width="240" height="75" viewBox="0 0 240 75" className="w-full">
                    <defs>
                      <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="oklch(27.004% 0.06738 262.727)"/>
                        <stop offset="50%" stopColor="oklch(20% 0.05 260)"/>
                        <stop offset="100%" stopColor="oklch(15% 0.04 260)"/>
                      </linearGradient>
                      <linearGradient id="stripe" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="oklch(0.71_0.2_50)"/>
                        <stop offset="50%" stopColor="oklch(1_0_0)"/>
                        <stop offset="100%" stopColor="oklch(0.7_0.2_150)"/>
                      </linearGradient>
                      <linearGradient id="window" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#dbeafe"/>
                        <stop offset="100%" stopColor="#93c5fd"/>
                      </linearGradient>
                      <linearGradient id="chrome" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#e5e7eb"/>
                        <stop offset="50%" stopColor="#9ca3af"/>
                        <stop offset="100%" stopColor="#6b7280"/>
                      </linearGradient>
                      <linearGradient id="wheelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#374151"/>
                        <stop offset="100%" stopColor="#1f2937"/>
                      </linearGradient>
                      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2"/>
                      </filter>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="blur"/>
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                      </filter>
                    </defs>

                    {/* === LOCOMOTIVE === */}
                    <g filter="url(#shadow)">
                      {/* Main body */}
                      <rect x="2" y="18" width="70" height="35" rx="4" fill="url(#bodyGrad)"/>
                      {/* Aerodynamic nose */}
                      <path d="M2,22 Q-10,35 2,50 L2,22" fill="url(#bodyGrad)"/>
                      {/* Tricolor stripe */}
                      <rect x="2" y="30" width="70" height="12" fill="url(#stripe)"/>
                      {/* Windows */}
                      <rect x="10" y="20" width="16" height="10" rx="2" fill="url(#window)"/>
                      <rect x="30" y="20" width="16" height="10" rx="2" fill="url(#window)"/>
                      <rect x="50" y="20" width="20" height="10" rx="2" fill="url(#window)"/>
                      {/* Window reflections */}
                      <rect x="11" y="21" width="5" height="5" rx="1" fill="white" opacity="0.4"/>
                      <rect x="31" y="21" width="5" height="5" rx="1" fill="white" opacity="0.4"/>
                      <rect x="51" y="21" width="5" height="5" rx="1" fill="white" opacity="0.4"/>
                      {/* Pantograph */}
                      <rect x="35" y="10" width="22" height="7" rx="2" fill="#4b5563"/>
                      <path d="M40,10 L45,0 L50,10" stroke="#6b7280" strokeWidth="2" fill="none"/>
                      <rect x="38" y="-2" width="10" height="4" rx="1" fill="url(#chrome)"/>
                      {/* Headlight */}
                      <circle cx="0" cy="35" r="5" fill="#fef3c7" filter="url(#glow)"/>
                      <circle cx="0" cy="35" r="2.5" fill="#fbbf24"/>
                      {/* IR emblem */}
                      <circle cx="60" cy="38" r="7" fill="white"/>
                      <text x="60" y="41" textAnchor="middle" fontSize="7" fontWeight="bold" fill="oklch(27.004% 0.06738 262.727)">IR</text>
                      {/* Bottom detail */}
                      <rect x="5" y="50" width="62" height="4" rx="1" fill="#374151"/>
                      {/* Smoke */}
                      <circle cx="5" cy="15" r="3" fill="#9ca3af" opacity="0.4" className="smoke-animate"/>
                      <circle cx="8" cy="12" r="2.5" fill="#9ca3af" opacity="0.3" className="smoke-animate" style={{ animationDelay: '0.2s' }}/>
                      <circle cx="11" cy="9" r="2" fill="#9ca3af" opacity="0.2" className="smoke-animate" style={{ animationDelay: '0.4s' }}/>
                    </g>

                    {/* === COACH 1 (AC) === */}
                    <g filter="url(#shadow)">
                      <rect x="77" y="18" width="75" height="35" rx="3" fill="url(#bodyGrad)"/>
                      <rect x="77" y="30" width="75" height="12" fill="url(#stripe)"/>
                      {/* Windows */}
                      {[0,1,2,3,4,5].map(i => (
                        <g key={i}>
                          <rect x={82 + i*12} y="20" width="11" height="10" rx="1.5" fill="url(#window)"/>
                          <rect x={83 + i*12} y="21" width="4" height="4" rx="0.5" fill="white" opacity="0.3"/>
                        </g>
                      ))}
                      {/* Door */}
                      <rect x="105" y="32" width="9" height="18" rx="1" fill="oklch(20% 0.05 260)" stroke="oklch(27.004% 0.06738 262.727)" strokeWidth="0.5"/>
                      {/* Class label */}
                      <rect x="80" y="42" width="18" height="6" rx="1" fill="#fbbf24"/>
                      <text x="89" y="46" textAnchor="middle" fontSize="5" fontWeight="bold" fill="oklch(27.004% 0.06738 262.727)">2A</text>
                      <rect x="77" y="50" width="75" height="4" rx="1" fill="#374151"/>
                    </g>

                    {/* === COACH 2 (Sleeper) === */}
                    <g filter="url(#shadow)">
                      <rect x="157" y="18" width="75" height="35" rx="3" fill="url(#bodyGrad)"/>
                      <rect x="157" y="30" width="75" height="12" fill="url(#stripe)"/>
                      {/* Barred windows */}
                      {[0,1,2,3,4,5].map(i => (
                        <g key={i}>
                          <rect x={162 + i*12} y="20" width="11" height="10" rx="1.5" fill="url(#window)"/>
                          {[0,1,2].map(j => (
                            <line key={j} x1={165 + i*12 + j*3} y1="20" x2={165 + i*12 + j*3} y2="30" stroke="oklch(27.004% 0.06738 262.727)" strokeWidth="0.5" opacity="0.5"/>
                          ))}
                        </g>
                      ))}
                      {/* Door */}
                      <rect x="185" y="32" width="9" height="18" rx="1" fill="oklch(20% 0.05 260)" stroke="oklch(27.004% 0.06738 262.727)" strokeWidth="0.5"/>
                      <rect x="160" y="42" width="18" height="6" rx="1" fill="#22c55e"/>
                      <text x="169" y="46" textAnchor="middle" fontSize="5" fontWeight="bold" fill="white">SL</text>
                      <rect x="157" y="50" width="75" height="4" rx="1" fill="#374151"/>
                    </g>

                    {/* Connectors */}
                    <rect x="71" y="30" width="9" height="15" rx="2" fill="url(#chrome)"/>
                    <rect x="151" y="30" width="9" height="15" rx="2" fill="url(#chrome)"/>

                    {/* === WHEELS === */}
                    {[18, 40, 58, 95, 130, 170, 210].map((x, i) => (
                      <g key={i}>
                        <circle cx={x} cy="58" r="7" fill="url(#wheelGrad)" className="wheel-animate" style={{ transformOrigin: `${x}px 58px` }}/>
                        <circle cx={x} cy="58" r="5" fill="none" stroke="#4b5563" strokeWidth="1"/>
                        <circle cx={x} cy="58" r="2" fill="#6b7280"/>
                        {/* Wheel spokes */}
                        <line x1={x-5} y1="58" x2={x+5} y2="58" stroke="#4b5563" strokeWidth="0.5" className="wheel-animate" style={{ transformOrigin: `${x}px 58px` }}/>
                        <line x1={x} y1="53" x2={x} y2="63" stroke="#4b5563" strokeWidth="0.5" className="wheel-animate" style={{ transformOrigin: `${x}px 58px` }}/>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>
            </div>

            {/* Progress Section */}
            <div className="space-y-4">
              {/* Progress bar container */}
              <div className="relative">
                <div 
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: 'rgba(0,0,0,0.06)' }}
                >
                  <div 
                    className="h-full rounded-full relative overflow-hidden transition-all duration-100"
                    style={{ 
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, oklch(0.71_0.2_50), oklch(1_0_0), oklch(0.7_0.2_150))'
                    }}
                  >
                    {/* Shimmer effect */}
                    <div 
                      className="absolute inset-0 w-full shimmer-animate"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[oklch(0.71_0.2_50)]" style={{ animation: 'pulse 1.5s infinite' }} />
                    <div className="w-2 h-2 rounded-full bg-[oklch(1_0_0)]" style={{ animation: 'pulse 1.5s infinite 0.2s' }} />
                    <div className="w-2 h-2 rounded-full bg-[oklch(0.7_0.2_150)]" style={{ animation: 'pulse 1.5s infinite 0.4s' }} />
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">Initializing Control Center</span>
                </div>
                <span className="text-sm font-semibold text-[color:var(--irctc-blue)]">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>

          {/* Subtle branding */}
          <p className="text-center text-xs text-muted-foreground/60 mt-6 tracking-widest uppercase">Train Section Controller (A.I Powered)</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login via useEffect
  }
  
  return <DashboardLayout />
}
