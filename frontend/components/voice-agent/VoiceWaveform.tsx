'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface VoiceWaveformProps {
  isActive: boolean
  variant?: 'user' | 'agent'
}

export function VoiceWaveform({ isActive, variant = 'user' }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    if (!isActive || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const bars = 20
    const barWidth = width / bars
    const barSpacing = 2

    const draw = () => {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < bars; i++) {
        const barHeight = Math.random() * (height * 0.6) + height * 0.2
        const x = i * (barWidth + barSpacing)
        const color = variant === 'agent' 
          ? 'rgba(99, 102, 241, 0.6)' // primary-500
          : 'rgba(34, 197, 94, 0.6)' // success-500

        ctx.fillStyle = color
        ctx.fillRect(x, (height - barHeight) / 2, barWidth - barSpacing, barHeight)
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive, variant])

  if (!isActive) return null

  return (
    <div className="flex items-center space-x-1">
      <canvas
        ref={canvasRef}
        width={60}
        height={20}
        className={cn(
          'opacity-70',
          variant === 'agent' && 'dark:opacity-50'
        )}
      />
    </div>
  )
}
