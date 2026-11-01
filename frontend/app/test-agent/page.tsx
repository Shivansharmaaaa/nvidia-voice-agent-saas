// import { auth } from '@clerk/nextjs' // TEMPORARILY DISABLED
import { AppLayout } from '@/components/layout/AppLayout'
import { VoiceAgentTester } from '@/components/voice-agent/VoiceAgentTester'

export default async function TestAgentPage() {
  // TEMPORARY: Bypass auth check
  // const { userId } = await auth()
  // if (!userId) {
  //   redirect('/sign-in')
  // }

  return (
    <AppLayout>
      <VoiceAgentTester />
    </AppLayout>
  )
}
