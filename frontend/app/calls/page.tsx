// import { auth } from '@clerk/nextjs' // TEMPORARILY DISABLED
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { EmptyState } from '@/components/ui/EmptyState'
import { Phone, Building2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export default async function CallsPage() {
  // TEMPORARY: Bypass auth check
  // const { userId } = await auth()
  // if (!userId) {
  //   redirect('/sign-in')
  // }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Calls
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View and manage call logs
          </p>
        </div>
        <Card>
          <EmptyState
            icon={Building2}
            title="Select an organization"
            description="Please select an organization from the dashboard to view call logs"
            action={{
              label: 'Go to Dashboard',
              href: '/dashboard',
            }}
          />
        </Card>
      </div>
    </AppLayout>
  )
}
