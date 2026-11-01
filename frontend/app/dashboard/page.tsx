// import { auth } from '@clerk/nextjs' // TEMPORARILY DISABLED
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { OrganizationsList } from '@/components/organizations/OrganizationsList'
import { CreateOrganizationButton } from '@/components/organizations/CreateOrganizationButton'
import { MetricTile } from '@/components/ui/MetricTile'
import { Card } from '@/components/ui/Card'
import { Phone, Clock, DollarSign, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  // TEMPORARY: Bypass auth check
  // const { userId } = await auth()
  // if (!userId) {
  //   redirect('/sign-in')
  // }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Overview of your voice agent platform
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricTile
            title="Active Calls"
            value="12"
            icon={Phone}
            trend={{ value: 8, isPositive: true }}
            subtitle="3 in queue"
          />
          <MetricTile
            title="Minutes Used"
            value="1,247"
            icon={Clock}
            subtitle="This month"
          />
          <MetricTile
            title="Cost Today"
            value="$24.50"
            icon={DollarSign}
            trend={{ value: -12, isPositive: true }}
            subtitle="vs yesterday"
          />
          <MetricTile
            title="Avg Resolution"
            value="2m 34s"
            icon={TrendingUp}
            trend={{ value: 5, isPositive: false }}
            subtitle="+5% from last week"
          />
        </div>

        {/* Organizations Section */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Organizations
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage your organizations and agents
              </p>
            </div>
            <CreateOrganizationButton />
          </div>
          <OrganizationsList />
        </Card>
      </div>
    </AppLayout>
  )
}
