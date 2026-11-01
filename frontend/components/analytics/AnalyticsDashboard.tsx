'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { TrendingUp, Phone, Clock, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { MetricTile } from '@/components/ui/MetricTile'
import { EmptyState } from '@/components/ui/EmptyState'

export function AnalyticsDashboard({
  organizationId,
  agentId,
}: {
  organizationId: string
  agentId?: string
}) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', organizationId, agentId],
    queryFn: async () => {
      try {
        const url = agentId
          ? `/organizations/${organizationId}/analytics/agents/${agentId}`
          : `/organizations/${organizationId}/analytics`
        const response = await api.get(url)
        return response.data
      } catch (error) {
        return null
      }
    },
  })

  if (isLoading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-32" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded" />
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <EmptyState
          icon={TrendingUp}
          title="No analytics data"
          description="Analytics will appear here once you have call data"
        />
      </Card>
    )
  }

  const aggregated = analytics?.aggregated || {}

  return (
    <Card>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
        Analytics
      </h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <MetricTile
          title="Total Calls"
          value={aggregated.totalCalls || 0}
          icon={Phone}
        />
        <MetricTile
          title="Avg Duration"
          value={
            aggregated.avgDuration
              ? `${Math.floor(aggregated.avgDuration / 60)}m ${Math.floor(aggregated.avgDuration % 60)}s`
              : '0m'
          }
          icon={Clock}
        />
        <MetricTile
          title="Escalation Rate"
          value={
            aggregated.escalationRate
              ? `${(aggregated.escalationRate * 100).toFixed(1)}%`
              : '0%'
          }
          icon={AlertCircle}
        />
        <MetricTile
          title="Total Duration"
          value={
            aggregated.totalDuration
              ? `${Math.floor(aggregated.totalDuration / 3600)}h`
              : '0h'
          }
          icon={TrendingUp}
        />
      </div>

      {/* Charts */}
      {analytics?.analytics && analytics.analytics.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Calls Over Time
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={analytics.analytics.slice(0, 7)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                }
              />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="totalCalls"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
