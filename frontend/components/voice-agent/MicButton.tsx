'use client'

import { useState, useRef } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MicButtonProps {
  isActive: boolean
  isPushToTalk: boolean
  onPress: () => void
  onRelease: () => void
  disabled?: boolean
}

export function MicButton({
  isActive,
  isPushToTalk,
  onPress,
  onRelease,
  disabled,
}: MicButtonProps) {
  const [isPressed, setIsPressed] = useState(false)
  const touchIdRef = useRef<number | null>(null)

  const handleMouseDown = () => {
    if (disabled) return
    setIsPressed(true)
    onPress()
  }

  const handleMouseUp = () => {
    if (isPressed) {
      setIsPressed(false)
      onRelease()
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return
    const touch = e.touches[0]
    touchIdRef.current = touch.identifier
    setIsPressed(true)
    onPress()
  }

  const handleTouchEnd = () => {
    if (isPressed) {
      setIsPressed(false)
      onRelease()
    }
    touchIdRef.current = null
  }

  const handleClick = () => {
    if (!isPushToTalk) {
      if (isActive) {
        onRelease()
      } else {
        onPress()
      }
    }
  }

  const showActive = isPushToTalk ? isPressed : isActive

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseDown={isPushToTalk ? handleMouseDown : undefined}
      onMouseUp={isPushToTalk ? handleMouseUp : undefined}
      onMouseLeave={isPushToTalk ? handleMouseUp : undefined}
      onTouchStart={isPushToTalk ? handleTouchStart : undefined}
      onTouchEnd={isPushToTalk ? handleTouchEnd : undefined}
      disabled={disabled}
      className={cn(
        'w-full btn-primary flex items-center justify-center transition-all',
        showActive
          ? 'bg-error-600 hover:bg-error-700'
          : 'bg-primary-600 hover:bg-primary-700',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {showActive ? (
        <MicOff className="h-4 w-4 mr-2" />
      ) : (
        <Mic className="h-4 w-4 mr-2" />
      )}
      <span>{showActive ? 'Stop' : 'Speak'}</span>
    </button>
  )
}
