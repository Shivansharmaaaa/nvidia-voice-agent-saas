import { redirect } from 'next/navigation'
// import { auth } from '@clerk/nextjs' // TEMPORARILY DISABLED

export default async function Home() {
  // TEMPORARY: Bypass auth, go directly to dashboard
  // const { userId } = await auth()
  // if (userId) {
  //   redirect('/dashboard')
  // } else {
  //   redirect('/sign-in')
  // }
  
  // TEMPORARY: Direct redirect to dashboard
  redirect('/dashboard')
}
