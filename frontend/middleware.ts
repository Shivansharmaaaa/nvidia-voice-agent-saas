// TEMPORARILY DISABLED - No Clerk credentials
// import { authMiddleware } from '@clerk/nextjs';

// export default authMiddleware({
//   publicRoutes: ['/api/webhooks(.*)', '/api/health'],
// });

// TEMPORARY: Allow all routes without auth
export default function middleware() {
  // No-op - allow all requests
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
