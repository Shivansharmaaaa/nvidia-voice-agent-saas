'use client'

import { Card } from '@/components/ui/Card'
import { Sparkles, Mic, Volume2, MessageSquare } from 'lucide-react'

export function DemoHintCard() {
  return (
    <Card className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-primary-200 dark:border-primary-800">
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
          <Sparkles className="h-4 w-4 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-primary-900 dark:text-primary-100 mb-2">
            Quick Start
          </h4>
          <ol className="text-xs text-primary-700 dark:text-primary-300 space-y-1.5">
            <li className="flex items-start">
              <span className="font-medium mr-1.5">1.</span>
              <span>Click "Start Session" to begin</span>
            </li>
            <li className="flex items-start">
              <span className="font-medium mr-1.5">2.</span>
              <span>Allow microphone access when prompted</span>
            </li>
            <li className="flex items-start">
              <span className="font-medium mr-1.5">3.</span>
              <span>Click "Speak" or use push-to-talk</span>
            </li>
            <li className="flex items-start">
              <span className="font-medium mr-1.5">4.</span>
              <span>View conversation in real-time</span>
            </li>
          </ol>
        </div>
      </div>
    </Card>
  )
}
