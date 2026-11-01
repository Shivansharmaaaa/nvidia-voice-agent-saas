'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  RotateCcw, 
  Volume2,
  MessageSquare,
  Clock,
  DollarSign,
  Sparkles
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { VoiceWaveform } from './VoiceWaveform'
import { AgentStatusBadge } from './AgentStatusBadge'
import { ConversationBubble } from './ConversationBubble'
import { MicButton } from './MicButton'
import { DemoHintCard } from './DemoHintCard'

interface Message {
  id: string
  speaker: 'user' | 'agent'
  text: string
  timestamp: Date
  latency?: number
}

type SessionStatus = 'idle' | 'listening' | 'thinking' | 'speaking'

interface VoiceAgentPlaygroundProps {
  organizationId: string
  agentId: string
}

// Debug helper - disabled to reduce console noise
function debugLog(message: string, data?: any) {
  // Disabled excessive logging
  // if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  //   console.log(`[VoiceAgentPlayground] ${message}`, data || '')
  // }
}

const SAMPLE_PROMPTS = [
  { label: 'Book an appointment', text: 'I would like to book an appointment for next week' },
  { label: 'Ask about pricing', text: 'What are your pricing plans?' },
  { label: 'Customer support', text: 'I need help with my account' },
]

export function VoiceAgentPlayground({ organizationId, agentId }: VoiceAgentPlaygroundProps) {
  // Debug: Log props to verify they're being passed correctly
  debugLog('Props received', { organizationId, agentId })
  
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [isPushToTalk, setIsPushToTalk] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [textInput, setTextInput] = useState('')
  const [useTextFallback, setUseTextFallback] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const sessionIdRef = useRef<string>(`test-${Date.now()}`)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number>()

  // Fetch agent details
  const { data: agent } = useQuery({
    queryKey: ['agent', organizationId, agentId],
    queryFn: async () => {
      // Validate that we have real IDs, not placeholders
      if (!organizationId || organizationId === '[id]' || !agentId || agentId === '[agentId]') {
        debugLog('Invalid IDs detected', { organizationId, agentId })
        return null
      }
      
      try {
        const url = `/organizations/${organizationId}/agents/${agentId}`
        debugLog('Fetching agent', { url })
        const response = await api.get(url)
        debugLog('Agent fetched successfully', response.data)
        return response.data
      } catch (error: any) {
        debugLog('Error fetching agent', { 
          message: error.message, 
          url: error.config?.url,
          organizationId,
          agentId 
        })
        return null
      }
    },
    enabled: !!organizationId && organizationId !== '[id]' && !!agentId && agentId !== '[agentId]',
  })

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Calculate session duration
  const sessionDuration = sessionStartTime
    ? Math.floor((Date.now() - sessionStartTime.getTime()) / 1000)
    : 0

  // Initialize audio
  const initializeAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      mediaStreamRef.current = stream
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      source.connect(analyser)

      return true
    } catch (error: any) {
      console.error('Error accessing microphone:', error)
      toast.error('Microphone access denied. Please allow microphone permissions.')
      return false
    }
  }, [])

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    try {
      // Use port 8000 for AI service WebSocket (not 3003)
      const wsUrl = process.env.NEXT_PUBLIC_AI_SERVICE_WS_URL || 'ws://localhost:8000'
      const sessionId = sessionIdRef.current
      console.log('Connecting WebSocket to:', `${wsUrl}/stream/${sessionId}`)
      const ws = new WebSocket(`${wsUrl}/stream/${sessionId}`)

      ws.onopen = () => {
        console.log('WebSocket connected')
        ws.send(JSON.stringify({
          event: 'start',
          session_id: sessionId,
          agent_config: {
            system_prompt: agent?.systemPrompt || 'You are a helpful AI assistant.',
            voice_speed: agent?.voiceSettings?.speed || 1.0,
            language: agent?.language || 'en-US',
          },
        }))
        setSessionStatus('idle')
        toast.success('Connected to voice agent')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'transcription') {
            setMessages(prev => [...prev, {
              id: `msg-${Date.now()}`,
              speaker: 'user',
              text: data.text,
              timestamp: new Date(),
              latency: data.latency,
            }])
            setSessionStatus('thinking')
          } else if (data.type === 'response') {
            setMessages(prev => [...prev, {
              id: `msg-${Date.now()}`,
              speaker: 'agent',
              text: data.text,
              timestamp: new Date(),
              latency: data.latency,
            }])
            setSessionStatus('speaking')
            // Update cost estimate (rough calculation)
            setEstimatedCost(prev => prev + 0.01)
          } else if (data.type === 'audio') {
            if (data.audio && data.audio.length > 0) {
              playAudioResponse(data.audio)
            } else {
              console.warn('Received empty audio data, skipping playback')
            }
          } else if (data.type === 'error') {
            toast.error(data.message || 'Error from AI service')
            setSessionStatus('idle')
          } else {
            // Unknown message type - log it
            console.log('Unknown WebSocket message type:', data.type, data)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = () => {
        toast.error('Failed to connect to AI service. Text input mode available as fallback.')
        setSessionStatus('idle')
        setUseTextFallback(true)
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setSessionStatus('idle')
      }

      wsRef.current = ws
      return true
    } catch (error) {
      console.error('Error connecting WebSocket:', error)
      toast.error('Failed to connect to AI service')
      return false
    }
  }, [agent])

  // Play audio response
  const playAudioResponse = useCallback(async (audioBase64: string) => {
    try {
      // Decode base64 audio (PCM format from backend)
      const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))
      
      if (audioBytes.length === 0) {
        console.warn('Empty audio data received')
        return
      }
      
      // Create AudioContext for PCM playback (use a separate context for playback)
      const playbackContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Convert PCM to AudioBuffer (16-bit PCM, 8kHz, mono)
      const sampleRate = 8000
      const numChannels = 1
      const length = Math.floor(audioBytes.length / 2) // 16-bit = 2 bytes per sample
      
      if (length === 0) {
        console.warn('Invalid audio length')
        return
      }
      
      const audioBuffer = playbackContext.createBuffer(numChannels, length, sampleRate)
      
      // Convert bytes to float32 samples (-1.0 to 1.0)
      const channelData = audioBuffer.getChannelData(0)
      for (let i = 0; i < length; i++) {
        const byteIndex = i * 2
        if (byteIndex + 1 >= audioBytes.length) break
        
        // Read Int16 (little-endian)
        const low = audioBytes[byteIndex]
        const high = audioBytes[byteIndex + 1]
        const sample = (high << 8) | low
        // Convert to signed Int16, then to float32
        const signedSample = sample > 32767 ? sample - 65536 : sample
        channelData[i] = signedSample / 32768.0
      }
      
      // Create and play audio source
      const source = playbackContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(playbackContext.destination)
      
      source.onended = () => {
        playbackContext.close()
        setSessionStatus('idle')
      }
      
      setSessionStatus('speaking')
      source.start(0)
      
      // Store reference to stop if needed
      audioElementRef.current = source as any
      
      console.log('✅ Audio playback started')
      
    } catch (error) {
      console.error('Error playing audio response:', error)
      setSessionStatus('idle')
      toast.error('Failed to play audio response')
    }
  }, [])

  // Send audio chunk
  const sendAudioChunk = useCallback((audioData: ArrayBuffer) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const base64 = btoa(String.fromCharCode(...new Uint8Array(audioData)))
      wsRef.current.send(JSON.stringify({
        event: 'media',
        media: { payload: base64 },
      }))
    }
  }, [])

  // Start recording
  const startRecording = useCallback(async () => {
    if (!mediaStreamRef.current || !audioContextRef.current) {
      const audioReady = await initializeAudio()
      if (!audioReady) return
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      const wsReady = connectWebSocket()
      if (!wsReady) return
    }

    try {
      setSessionStatus('listening')
      const audioContext = audioContextRef.current!
      
      // Clean up previous processor if exists
      if (processorRef.current) {
        processorRef.current.disconnect()
        processorRef.current = null
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect()
        sourceRef.current = null
      }
      
      const source = audioContext.createMediaStreamSource(mediaStreamRef.current!)
      sourceRef.current = source
      
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        // Check if WebSocket is open and we're listening
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0)
          const buffer = new ArrayBuffer(inputData.length * 2)
          const view = new DataView(buffer)

          for (let i = 0; i < inputData.length; i++) {
            const sample = Math.max(-1, Math.min(1, inputData[i]))
            // Convert float32 (-1.0 to 1.0) to Int16 (little-endian)
            const int16Sample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)))
            view.setInt16(i * 2, int16Sample, true) // true = little-endian
          }

          sendAudioChunk(buffer)
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)
      
      console.log('✅ Recording started, audio processor connected')

      // Monitor audio levels
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        const updateLevel = () => {
          if (analyserRef.current && sessionStatus === 'listening') {
            analyserRef.current.getByteFrequencyData(dataArray)
            animationFrameRef.current = requestAnimationFrame(updateLevel)
          }
        }
        updateLevel()
      }
    } catch (error) {
      console.error('Error starting recording:', error)
      toast.error('Failed to start recording')
      setSessionStatus('idle')
    }
  }, [sessionStatus, initializeAudio, connectWebSocket, sendAudioChunk])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    setSessionStatus('thinking')
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'stop' }))
    }
  }, [])

  // Start session
  const startSession = useCallback(async () => {
    // Reset session ID
    sessionIdRef.current = `test-${Date.now()}`
    
    // Start session even if audio/websocket fails (text fallback mode)
    setSessionStartTime(new Date())
    setEstimatedCost(0)
    setMessages([])
    
    // Try to connect WebSocket first
    const wsReady = connectWebSocket()
    
    if (!wsReady) {
      setUseTextFallback(true)
      toast.info('Starting in text input mode. Audio streaming unavailable.')
      return
    }
    
    // Wait for WebSocket to be fully connected
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Try to initialize audio
    const audioReady = await initializeAudio()
    
    if (audioReady && wsRef.current?.readyState === WebSocket.OPEN) {
      // Auto-start recording when session starts and audio is ready
      console.log('Starting recording...')
      await startRecording()
    } else {
      setUseTextFallback(true)
      toast.info('Microphone not available. Using text input mode.')
    }
  }, [initializeAudio, connectWebSocket, startRecording])

  // Stop session
  const stopSession = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    setSessionStatus('idle')
    setSessionStartTime(null)
  }, [])

  // Reset session
  const resetSession = useCallback(() => {
    stopSession()
    setMessages([])
    setEstimatedCost(0)
    sessionIdRef.current = `test-${Date.now()}`
  }, [stopSession])

  // Handle sample prompt or text input
  const handleSamplePrompt = useCallback((text: string) => {
    if (!sessionStartTime) {
      toast.error('Please start a session first')
      return
    }

    // Add user message immediately
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}`,
      speaker: 'user',
      text: text,
      timestamp: new Date(),
    }])
    setSessionStatus('thinking')

    // Try to send via WebSocket if available
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: 'text',
        text: text,
      }))
    } else {
      // Fallback: Simulate agent response if WebSocket not available
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}`,
          speaker: 'agent',
          text: 'I received your message. To enable full voice interaction, please ensure the AI service is running on port 8000.',
          timestamp: new Date(),
        }])
        setSessionStatus('idle')
        toast.info('WebSocket not connected. This is a simulated response.')
      }, 1000)
    }
  }, [sessionStartTime])

  // Cleanup
  useEffect(() => {
    return () => {
      stopSession()
    }
  }, [stopSession])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Voice Agent Playground
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Test your AI voice agent in real-time
          </p>
        </div>
        {agent && (
          <Badge variant="info" className="text-sm">
            {agent.name}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-1 space-y-4">
          {/* Status Card */}
          <Card>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Session Status
                </h3>
                <AgentStatusBadge status={sessionStatus} />
              </div>

              {/* Session Stats */}
              {sessionStartTime && (
                <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <Clock className="h-4 w-4 mr-1.5" />
                      Duration
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDuration(sessionDuration)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <DollarSign className="h-4 w-4 mr-1.5" />
                      Est. Cost
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      ${estimatedCost.toFixed(3)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Controls */}
          <Card>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Controls
            </h3>
            <div className="space-y-3">
              <button
                onClick={startSession}
                disabled={sessionStatus !== 'idle' && sessionStartTime !== null}
                className="w-full btn-primary flex items-center justify-center"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Session
              </button>

              <div className="grid grid-cols-2 gap-2">
                <MicButton
                  isActive={sessionStatus === 'listening'}
                  isPushToTalk={isPushToTalk}
                  onPress={startRecording}
                  onRelease={stopRecording}
                  disabled={!sessionStartTime || sessionStatus === 'thinking' || sessionStatus === 'speaking'}
                />

                <button
                  onClick={stopSession}
                  disabled={!sessionStartTime}
                  className="btn-secondary flex items-center justify-center"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </button>
              </div>

              <button
                onClick={resetSession}
                disabled={!sessionStartTime}
                className="w-full btn-secondary flex items-center justify-center"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Session
              </button>
            </div>

            {/* Push-to-talk Toggle */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Push-to-talk mode
                </span>
                <input
                  type="checkbox"
                  checked={isPushToTalk}
                  onChange={(e) => setIsPushToTalk(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {isPushToTalk
                  ? 'Hold button to speak'
                  : 'Auto-detect speech'}
              </p>
            </div>
          </Card>

          {/* Sample Prompts */}
          <Card>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Sample Prompts
            </h3>
            <div className="space-y-2">
              {SAMPLE_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSamplePrompt(prompt.text)}
                  disabled={!sessionStartTime}
                  className="w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="h-3 w-3 inline mr-2 text-primary-600" />
                  {prompt.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Text Input Fallback */}
          {useTextFallback && (
            <Card className="bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800">
              <h3 className="text-sm font-semibold text-warning-900 dark:text-warning-100 mb-2">
                Text Input Mode
              </h3>
              <p className="text-xs text-warning-700 dark:text-warning-300 mb-3">
                Audio streaming unavailable. Use text input to test the agent.
              </p>
              <div className="space-y-2">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type your message here..."
                  rows={3}
                  className="input text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && textInput.trim()) {
                      e.preventDefault()
                      handleSamplePrompt(textInput.trim())
                      setTextInput('')
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (textInput.trim()) {
                      handleSamplePrompt(textInput.trim())
                      setTextInput('')
                    }
                  }}
                  disabled={!textInput.trim() || !sessionStartTime}
                  className="w-full btn-primary text-sm"
                >
                  Send Message
                </button>
              </div>
            </Card>
          )}

          {/* Demo Hint */}
          <DemoHintCard />
        </div>

        {/* Right Panel - Conversation */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Conversation
              </h3>
              {sessionStatus === 'listening' && (
                <VoiceWaveform isActive={true} />
              )}
              {sessionStatus === 'speaking' && (
                <VoiceWaveform isActive={true} variant="agent" />
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Start a session to begin testing your voice agent
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <ConversationBubble
                      key={message.id}
                      message={message}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
