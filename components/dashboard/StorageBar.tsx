'use client'
import { useMemo } from 'react'

function fmt(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

export default function StorageBar({ used, limit }: { used: number; limit: number }) {
  const pct = useMemo(() => Math.min((used / limit) * 100, 100), [used, limit])
  const color = pct > 90 ? '#FF4444' : pct > 70 ? '#FFB800' : '#00FF94'

  return (
    <div className="bg-[#111] border border-[#2A2A2A] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[#555] text-xs uppercase tracking-wider">Storage</p>
        <p className="text-xs text-[#A0A0A0]">
          <span style={{ color }} className="font-semibold">{fmt(used)}</span>
          {' '}<span className="text-[#555]">/ {fmt(limit)}</span>
        </p>
      </div>
      <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
