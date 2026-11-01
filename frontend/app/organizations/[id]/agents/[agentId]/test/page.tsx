'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { VoiceAgentPlayground } from '@/components/voice-agent/VoiceAgentPlayground'

export default function TestAgentPage() {
  const params = useParams()
  const organizationId = params?.id as string
  const agentId = params?.agentId as string

  // Debug: Log params
  useEffect(() => {
    console.log('TestAgentPage - organizationId:', organizationId, 'agentId:', agentId)
  }, [organizationId, agentId])

  if (!organizationId || !agentId) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <VoiceAgentPlayground 
        organizationId={organizationId}
        agentId={agentId}
      />
    </AppLayout>
  )
}
