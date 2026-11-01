// import { auth } from '@clerk/nextjs' // TEMPORARILY DISABLED
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'

export default async function SettingsPage() {
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
            Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your account and preferences
          </p>
        </div>
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Account Settings
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Settings functionality will be available soon.
            </p>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
