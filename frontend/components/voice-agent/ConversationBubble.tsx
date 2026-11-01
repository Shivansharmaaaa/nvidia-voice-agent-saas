'use client'

import { Mic, Bot, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  speaker: 'user' | 'agent'
  text: string
  timestamp: Date
  latency?: number
}

interface ConversationBubbleProps {
  message: Message
}

export function ConversationBubble({ message }: ConversationBubbleProps) {
  const isUser = message.speaker === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[75%] flex flex-col', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-lg px-4 py-3',
            isUser
              ? 'bg-primary-600 text-white rounded-br-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
          )}
        >
          <div className="flex items-start space-x-2">
            {!isUser && (
              <Bot className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-500 dark:text-gray-400" />
            )}
            <p className="text-sm leading-relaxed">{message.text}</p>
            {isUser && (
              <Mic className="h-4 w-4 mt-0.5 flex-shrink-0 opacity-70" />
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {message.latency && (
            <Badge variant="gray" className="text-xs">
              {message.latency}ms
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
