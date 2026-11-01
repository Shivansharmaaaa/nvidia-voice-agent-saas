// import { auth } from '@clerk/nextjs' // TEMPORARILY DISABLED
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { AgentDetails } from '@/components/agents/AgentDetails'
import { CallsList } from '@/components/calls/CallsList'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { Card } from '@/components/ui/Card'

export default async function AgentPage({
  params,
}: {
  params: { id: string; agentId: string }
}) {
  // TEMPORARY: Bypass auth check
  // const { userId } = await auth()
  // if (!userId) {
  //   redirect('/sign-in')
  // }

  return (
    <AppLayout>
      <div className="space-y-6">
        <AgentDetails organizationId={params.id} agentId={params.agentId} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Recent Calls
            </h2>
            <CallsList organizationId={params.id} agentId={params.agentId} />
          </Card>
          <AnalyticsDashboard organizationId={params.id} agentId={params.agentId} />
        </div>
      </div>
    </AppLayout>
  )
}
