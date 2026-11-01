'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import Link from 'next/link'
import { Building2, Bot, Phone, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'

interface Organization {
  id: string
  name: string
  slug: string
  plan?: string
  _count: {
    agents: number
    callSessions: number
  }
}

export function OrganizationsList() {
  const { data: organizations, isLoading } = useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: async () => {
      try {
        const response = await api.get('/organizations')
        return response.data || []
      } catch (error: any) {
        // Return empty array if API fails (no database or backend not running)
        console.warn('Failed to fetch organizations:', error.message)
        return []
      }
    },
    retry: false, // Don't retry if backend is not available
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded" />
          </Card>
        ))}
      </div>
    )
  }

  if (!organizations || organizations.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No organizations yet"
        description="Create your first organization to start building AI voice agents"
        action={{
          label: 'Create Organization',
          onClick: () => {
            // Will be handled by CreateOrganizationButton
          },
        }}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {organizations.map((org) => (
        <Link
          key={org.id}
          href={`/organizations/${org.id}`}
          className="block"
        >
          <Card hover className="h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {org.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {org.slug}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1.5 text-gray-600 dark:text-gray-400">
                  <Bot className="h-4 w-4" />
                  <span className="font-medium">{org._count.agents}</span>
                  <span className="text-gray-500">agents</span>
                </div>
                <div className="flex items-center space-x-1.5 text-gray-600 dark:text-gray-400">
                  <Phone className="h-4 w-4" />
                  <span className="font-medium">{org._count.callSessions}</span>
                  <span className="text-gray-500">calls</span>
                </div>
              </div>
              {org.plan && (
                <Badge variant={org.plan === 'enterprise' ? 'info' : 'gray'}>
                  {org.plan}
                </Badge>
              )}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
