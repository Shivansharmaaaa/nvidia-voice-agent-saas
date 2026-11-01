'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Phone, Clock, User, Bot, AlertCircle, FileText } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

interface Transcript {
  id: string
  speaker: string
  text: string
  timestamp: string
  confidence?: number
  latency?: number
}

interface CallSession {
  id: string
  phoneNumber: string
  status: string
  duration?: number
  startTime: string
  endTime?: string
  latency?: any
  interruptions: number
  escalations: number
  agent: {
    id: string
    name: string
  }
  transcripts: Transcript[]
}

export function CallDetails({
  organizationId,
  callId,
}: {
  organizationId: string
  callId: string
}) {
  const { data: call, isLoading } = useQuery<CallSession>({
    queryKey: ['call', organizationId, callId],
    queryFn: async () => {
      const response = await api.get(
        `/organizations/${organizationId}/calls/${callId}`
      )
      return response.data
    },
  })

  if (isLoading) {
    return <div className="text-center py-12">Loading call details...</div>
  }

  if (!call) {
    return <div>Call not found</div>
  }

  return (
    <div className="space-y-6">
      {/* Call Header */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Call Details
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {format(new Date(call.startTime), 'PPpp')}
            </p>
          </div>
          <Badge
            variant={
              call.status === 'completed'
                ? 'success'
                : call.status === 'in-progress'
                ? 'info'
                : 'gray'
            }
          >
            {call.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center">
              <Phone className="h-3 w-3 mr-1.5" />
              Phone Number
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 font-mono">
              {call.phoneNumber}
            </div>
          </div>
          {call.duration && (
            <div className="card p-4 bg-gray-50 dark:bg-gray-800/50">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                <Clock className="h-3 w-3 mr-1.5" />
                Duration
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {Math.floor(call.duration / 60)}m {call.duration % 60}s
              </div>
            </div>
          )}
          {call.latency && (
            <div className="card p-4 bg-gray-50 dark:bg-gray-800/50">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Avg Latency
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {call.latency.avg_asr_latency_ms
                  ? `${call.latency.avg_asr_latency_ms.toFixed(0)}ms`
                  : 'N/A'}
              </div>
            </div>
          )}
          {call.escalations > 0 && (
            <div className="card p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
              <div className="text-xs font-medium text-warning-700 dark:text-warning-400 mb-1 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1.5" />
                Escalations
              </div>
              <div className="text-lg font-semibold text-warning-900 dark:text-warning-100">
                {call.escalations}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Transcript */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Transcript
        </h2>
        {!call.transcripts || call.transcripts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No transcript available"
            description="Transcript will appear here once the call is processed"
          />
        ) : (
          <div className="space-y-4">
            {call.transcripts.map((transcript) => (
              <div
                key={transcript.id}
                className={`flex ${
                  transcript.speaker === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={cn(
                    'max-w-2xl rounded-lg p-4',
                    transcript.speaker === 'user'
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  )}
                >
                  <div className="flex items-center mb-2">
                    {transcript.speaker === 'user' ? (
                      <User className="h-4 w-4 mr-2 text-primary-600 dark:text-primary-400" />
                    ) : (
                      <Bot className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                    )}
                    <span className="text-xs font-medium capitalize">
                      {transcript.speaker}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {format(new Date(transcript.timestamp), 'HH:mm:ss')}
                    </span>
                    {transcript.latency && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        ({transcript.latency}ms)
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{transcript.text}</p>
                  {transcript.confidence && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Confidence: {(transcript.confidence * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
