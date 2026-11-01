'use client'

import { Badge } from '@/components/ui/Badge'
import { Loader2, Mic, Brain, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type SessionStatus = 'idle' | 'listening' | 'thinking' | 'speaking'

interface AgentStatusBadgeProps {
  status: SessionStatus
}

export function AgentStatusBadge({ status }: AgentStatusBadgeProps) {
  const config = {
    idle: {
      label: 'Idle',
      icon: Mic,
      variant: 'gray' as const,
      className: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    },
    listening: {
      label: 'Listening',
      icon: Mic,
      variant: 'success' as const,
      className: 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400',
    },
    thinking: {
      label: 'Thinking',
      icon: Brain,
      variant: 'info' as const,
      className: 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400',
    },
    speaking: {
      label: 'Speaking',
      icon: Volume2,
      variant: 'info' as const,
      className: 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400',
    },
  }

  const { label, icon: Icon, variant, className } = config[status]
  const isAnimated = status === 'thinking' || status === 'listening'

  return (
    <div className={cn('inline-flex items-center space-x-2 px-3 py-2 rounded-lg', className)}>
      {isAnimated ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}
