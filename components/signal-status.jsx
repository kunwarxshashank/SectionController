"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

const signals = [
  { id: "GZB-01", label: "गाज़ियाबाद-01", status: "stop" },
  { id: "GZB-02", label: "गाज़ियाबाद-02", status: "stop" },
  { id: "ALG-01", label: "अलीगढ़-01", status: "caution" },
  { id: "ALG-02", label: "अलीगढ़-02", status: "stop" },
  { id: "CNB-01", label: "कानपुर-01", status: "clear" },
  { id: "CNB-02", label: "कानपुर-02", status: "clear" },
]

const statusColors = {
  clear: "bg-[oklch(0.7_0.2_150)] shadow-lg shadow-[oklch(0.7_0.2_150)/0.3]",
  caution: "bg-[oklch(0.82_0.16_90)] shadow-lg shadow-[oklch(0.82_0.16_90)/0.3]",
  stop: "bg-[oklch(0.6_0.23_25)] shadow-lg shadow-[oklch(0.6_0.23_25)/0.3]",
}

export default function SignalStatus() {
  return (
    <Card className="w-full rounded-xl border shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg font-semibold">
          Signal Status <span className="text-muted-foreground text-sm ml-2">सिग्नल स्थिति</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">Last Update: 14:23 IST</p>
      </CardHeader>

      <CardContent>
        <div className="relative px-6 py-8">
          {/* Horizontal Line positioned in the middle of circles */}
          <div className="absolute top-1/2 left-6 right-6 h-[2px] bg-border -translate-y-1/2"></div>
          <div className="flex justify-between items-center relative z-10">
            {signals.map((signal) => (
              <div key={signal.id} className="flex flex-col items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full border-2 border-gray-600 ${statusColors[signal.status]}`}
                ></div>
                <p className="text-xs font-semibold text-foreground">{signal.id}</p>
                <p className="text-[10px] text-muted-foreground text-center">{signal.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-6 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[oklch(0.7_0.2_150)]"></span>
            <span>Clear (2)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[oklch(0.82_0.16_90)]"></span>
            <span>Caution (1)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[oklch(0.6_0.23_25)]"></span>
            <span>Stop (3)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 border border-border bg-muted"></span>
            <span>Block Occupied</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
