'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Phone, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

interface CallSession {
  id: string
  phoneNumber: string
  status: string
  duration?: number
  startTime: string
  agent: {
    id: string
    name: string
  }
  _count: {
    transcripts: number
  }
}

export function CallsList({
  organizationId,
  agentId,
}: {
  organizationId: string
  agentId?: string
}) {
  const { data: calls, isLoading } = useQuery<CallSession[]>({
    queryKey: ['calls', organizationId, agentId],
    queryFn: async () => {
      try {
        const url = `/organizations/${organizationId}/calls${
          agentId ? `?agentId=${agentId}` : ''
        }`
        const response = await api.get(url)
        return response.data
      } catch (error) {
        return []
      }
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded" />
          </Card>
        ))}
      </div>
    )
  }

  if (!calls || calls.length === 0) {
    return (
      <EmptyState
        icon={Phone}
        title="No calls yet"
        description="Call logs will appear here once you start receiving calls"
      />
    )
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'in-progress':
        return 'info'
      case 'failed':
        return 'error'
      default:
        return 'gray'
    }
  }

  return (
    <div className="space-y-3">
      {calls.map((call) => (
        <Link
          key={call.id}
          href={`/organizations/${organizationId}/calls/${call.id}`}
          className="block"
        >
          <Card hover>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    call.status === 'completed'
                      ? 'bg-success-500'
                      : call.status === 'in-progress'
                      ? 'bg-primary-500 animate-pulse'
                      : 'bg-gray-400'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">
                      {call.phoneNumber}
                    </span>
                    <Badge variant={getStatusVariant(call.status)} className="ml-2">
                      {call.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {formatDistanceToNow(new Date(call.startTime), {
                        addSuffix: true,
                      })}
                    </span>
                    {call.duration && (
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {Math.floor(call.duration / 60)}m {call.duration % 60}s
                      </span>
                    )}
                    {call._count.transcripts > 0 && (
                      <span>{call._count.transcripts} transcripts</span>
                    )}
                  </div>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" />
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
