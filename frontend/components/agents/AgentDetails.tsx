'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Bot, Phone, Play, Pause, Settings } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'

export function AgentDetails({
  organizationId,
  agentId,
}: {
  organizationId: string
  agentId: string
}) {
  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent', organizationId, agentId],
    queryFn: async () => {
      const response = await api.get(
        `/organizations/${organizationId}/agents/${agentId}`
      )
      return response.data
    },
  })

  if (isLoading) {
    return <div className="text-center py-12">Loading agent...</div>
  }

  if (!agent) {
    return <div>Agent not found</div>
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {agent.name}
            </h1>
            {agent.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {agent.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href={`/organizations/${organizationId}/agents/${agentId}/test`}
            className="btn-primary flex items-center"
          >
            <Play className="h-4 w-4 mr-2" />
            Test Agent
          </Link>
          <Link
            href={`/organizations/${organizationId}/agents/${agentId}/configure`}
            className="btn-secondary flex items-center"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Link>
          {agent.status === 'active' ? (
            <button className="btn-secondary flex items-center bg-warning-50 hover:bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:hover:bg-warning-900/30 dark:text-warning-400">
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </button>
          ) : (
            <button className="btn-primary flex items-center bg-success-600 hover:bg-success-700">
              <Play className="h-4 w-4 mr-2" />
              Activate
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Status
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
            {agent.status}
          </div>
        </div>
        {agent.phoneNumber && (
          <div className="card p-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Phone Number
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center font-mono">
              <Phone className="h-4 w-4 mr-1.5 text-gray-400" />
              {agent.phoneNumber}
            </div>
          </div>
        )}
        <div className="card p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Language
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {agent.language || 'en-US'}
          </div>
        </div>
        <div className="card p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Voice Model
          </div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {agent.voiceModel || 'magpie'}
          </div>
        </div>
      </div>
    </Card>
  )
}
