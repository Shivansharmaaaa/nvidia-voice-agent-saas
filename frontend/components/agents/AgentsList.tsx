'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import Link from 'next/link'
import { Bot, Phone, Play, Pause, MoreVertical, Copy, Edit } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

interface Agent {
  id: string
  name: string
  description?: string
  status: string
  phoneNumber?: string
  _count: {
    callSessions: number
  }
}

export function AgentsList({ organizationId }: { organizationId: string }) {
  const { data: agents, isLoading } = useQuery<Agent[]>({
    queryKey: ['agents', organizationId],
    queryFn: async () => {
      try {
        const response = await api.get(`/organizations/${organizationId}/agents`)
        return response.data
      } catch (error) {
        return []
      }
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded" />
          </Card>
        ))}
      </div>
    )
  }

  if (!agents || agents.length === 0) {
    return (
      <EmptyState
        icon={Bot}
        title="No agents yet"
        description="Create your first AI voice agent to start handling customer calls"
      />
    )
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'paused':
        return 'warning'
      case 'draft':
        return 'gray'
      default:
        return 'gray'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent) => (
        <Link
          key={agent.id}
          href={`/organizations/${organizationId}/agents/${agent.id}`}
          className="block"
        >
          <Card hover className="h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {agent.name}
                  </h3>
                  {agent.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {agent.description}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={getStatusVariant(agent.status)}>
                {agent.status}
              </Badge>
            </div>

            <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-800">
              {agent.phoneNumber && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="font-mono">{agent.phoneNumber}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {agent._count.callSessions} calls
                </span>
                <span className="text-primary-600 dark:text-primary-400 font-medium">
                  View →
                </span>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
