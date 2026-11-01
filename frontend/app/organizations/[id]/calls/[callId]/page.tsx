// import { auth } from '@clerk/nextjs' // TEMPORARILY DISABLED
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { CallDetails } from '@/components/calls/CallDetails'

export default async function CallPage({
  params,
}: {
  params: { id: string; callId: string }
}) {
  // TEMPORARY: Bypass auth check
  // const { userId } = await auth()
  // if (!userId) {
  //   redirect('/sign-in')
  // }

  return (
    <AppLayout>
      <CallDetails organizationId={params.id} callId={params.callId} />
    </AppLayout>
  )
}
