// import { auth } from '@clerk/nextjs' // TEMPORARILY DISABLED
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { AgentsList } from '@/components/agents/AgentsList'
import { CreateAgentButton } from '@/components/agents/CreateAgentButton'

export default async function OrganizationPage({
  params,
}: {
  params: { id: string }
}) {
  // TEMPORARY: Bypass auth check
  // const { userId } = await auth()
  // if (!userId) {
  //   redirect('/sign-in')
  // }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Voice Agents
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create and manage your AI voice agents
            </p>
          </div>
          <CreateAgentButton organizationId={params.id} />
        </div>
        <AgentsList organizationId={params.id} />
      </div>
    </AppLayout>
  )
}
