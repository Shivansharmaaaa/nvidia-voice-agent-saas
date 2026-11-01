'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Volume2, VolumeX, Loader2, MessageSquare, Settings } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  speaker: 'user' | 'agent'
  text: string
  timestamp: Date
}

export function VoiceAgentTester() {
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [audioLevel, setAudioLevel] = useState(0)
  const [agentConfig, setAgentConfig] = useState({
    systemPrompt: 'You are a helpful AI assistant. Be concise and friendly.',
    voiceSpeed: 1.0,
    language: 'en-US',
  })

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const sessionIdRef = useRef<string>(`demo-${Date.now()}`)
  const animationFrameRef = useRef<number>()

  // Initialize audio context and microphone
  const initializeAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      })
      
      mediaStreamRef.current = stream
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      source.connect(analyser)

      // Monitor audio levels
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const updateAudioLevel = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          setAudioLevel(average / 255)
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
        }
      }
      updateAudioLevel()

      toast.success('Microphone access granted')
    } catch (error: any) {
      console.error('Error accessing microphone:', error)
      toast.error('Failed to access microphone. Please check permissions.')
    }
  }

  // Connect to AI service WebSocket
  const connectWebSocket = () => {
    try {
      // Default to localhost:3003 (AI service port)
      const wsUrl = process.env.NEXT_PUBLIC_AI_SERVICE_WS_URL || 'ws://localhost:3003'
      const sessionId = sessionIdRef.current
      const ws = new WebSocket(`${wsUrl}/stream/${sessionId}`)
      
      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        toast.success('Connected to AI service')
        
        // Send start event
        ws.send(JSON.stringify({
          event: 'start',
          session_id: sessionId,
        }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'transcription') {
            // User speech transcribed
            setMessages(prev => [...prev, {
              id: `msg-${Date.now()}`,
              speaker: 'user',
              text: data.text,
              timestamp: new Date(),
            }])
          } else if (data.type === 'response') {
            // Agent response text
            setMessages(prev => [...prev, {
              id: `msg-${Date.now()}`,
              speaker: 'agent',
              text: data.text,
              timestamp: new Date(),
            }])
          } else if (data.type === 'audio') {
            // Agent audio response
            playAudioResponse(data.audio)
          } else if (data.type === 'error') {
            toast.error(data.message || 'Error from AI service')
            setIsProcessing(false)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        toast.error('Failed to connect to AI service. Make sure it\'s running on port 8000.')
        setIsConnected(false)
        setIsRecording(false)
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        setIsRecording(false)
        setIsProcessing(false)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Error connecting WebSocket:', error)
      toast.error('Failed to connect to AI service')
    }
  }

  // Play audio response
  const playAudioResponse = (audioBase64: string) => {
    try {
      const audio = new Audio(`data:audio/wav;base64,${audioBase64}`)
      audioElementRef.current = audio
      audio.play().catch(error => {
        console.error('Error playing audio:', error)
      })
      setIsProcessing(false)
    } catch (error) {
      console.error('Error processing audio response:', error)
      setIsProcessing(false)
    }
  }

  // Send audio chunk to WebSocket
  const sendAudioChunk = (audioData: ArrayBuffer) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Convert to base64
      const base64 = btoa(
        String.fromCharCode(...new Uint8Array(audioData))
      )
      
      wsRef.current.send(JSON.stringify({
        event: 'media',
        media: {
          payload: base64,
        },
      }))
    }
  }

  // Start recording and streaming
  const startRecording = async () => {
    if (!isConnected) {
      await initializeAudio()
      connectWebSocket()
      return
    }

    if (!mediaStreamRef.current || !audioContextRef.current) {
      await initializeAudio()
    }

    try {
      setIsRecording(true)
      setIsProcessing(false)

      const audioContext = audioContextRef.current!
      const source = audioContext.createMediaStreamSource(mediaStreamRef.current!)
      
      // Create script processor for audio chunks
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      
      processor.onaudioprocess = (e) => {
        if (isRecording && isConnected) {
          const inputData = e.inputBuffer.getChannelData(0)
          const buffer = new ArrayBuffer(inputData.length * 2)
          const view = new DataView(buffer)
          
          for (let i = 0; i < inputData.length; i++) {
            const sample = Math.max(-1, Math.min(1, inputData[i]))
            view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
          }
          
          sendAudioChunk(buffer)
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      toast.success('Recording started')
    } catch (error) {
      console.error('Error starting recording:', error)
      toast.error('Failed to start recording')
      setIsRecording(false)
    }
  }

  // Stop recording
  const stopRecording = () => {
    setIsRecording(false)
    setIsProcessing(true)

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: 'stop',
      }))
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    setAudioLevel(0)
  }

  // Disconnect
  const disconnect = () => {
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

    setIsConnected(false)
    setIsRecording(false)
    setIsProcessing(false)
    setAudioLevel(0)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Voice Agent Tester
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Test your AI voice agent in real-time
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Control Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connection Status */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  'h-3 w-3 rounded-full',
                  isConnected ? 'bg-success-500 animate-pulse' : 'bg-gray-400'
                )} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <Badge variant={isConnected ? 'success' : 'gray'}>
                {isConnected ? 'Live' : 'Offline'}
              </Badge>
            </div>

            {/* Audio Level Indicator */}
            {isRecording && (
              <div className="mb-4">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-600 transition-all duration-100"
                    style={{ width: `${audioLevel * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                  Audio Level
                </p>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex items-center justify-center space-x-4">
              {!isConnected ? (
                <button
                  onClick={startRecording}
                  className="btn-primary flex items-center space-x-2 px-6 py-3"
                >
                  <Mic className="h-5 w-5" />
                  <span>Connect & Start</span>
                </button>
              ) : (
                <>
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className="btn-primary flex items-center space-x-2 px-6 py-3"
                    >
                      <Mic className="h-5 w-5" />
                      <span>Start Recording</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="btn-secondary flex items-center space-x-2 px-6 py-3 bg-error-50 hover:bg-error-100 text-error-700 dark:bg-error-900/20 dark:hover:bg-error-900/30 dark:text-error-400"
                    >
                      <MicOff className="h-5 w-5" />
                      <span>Stop Recording</span>
                    </button>
                  )}
                  <button
                    onClick={disconnect}
                    className="btn-secondary flex items-center space-x-2 px-6 py-3"
                  >
                    <span>Disconnect</span>
                  </button>
                </>
              )}

              {isProcessing && (
                <div className="flex items-center space-x-2 text-primary-600 dark:text-primary-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Processing...</span>
                </div>
              )}
            </div>
          </Card>

          {/* Conversation */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Conversation
              </h2>
              <MessageSquare className="h-5 w-5 text-gray-400" />
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start a conversation to see messages here</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.speaker === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg p-3',
                        message.speaker === 'user'
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                      )}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className="text-xs opacity-60 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Settings Panel */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Agent Settings
              </h2>
              <Settings className="h-5 w-5 text-gray-400" />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  System Prompt
                </label>
                <textarea
                  value={agentConfig.systemPrompt}
                  onChange={(e) => setAgentConfig({ ...agentConfig, systemPrompt: e.target.value })}
                  rows={4}
                  className="input text-sm"
                  placeholder="You are a helpful AI assistant..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Voice Speed: {agentConfig.voiceSpeed}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={agentConfig.voiceSpeed}
                  onChange={(e) => setAgentConfig({ ...agentConfig, voiceSpeed: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Language
                </label>
                <select
                  value={agentConfig.language}
                  onChange={(e) => setAgentConfig({ ...agentConfig, language: e.target.value })}
                  className="input"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-ES">Spanish</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                </select>
              </div>
            </div>
          </Card>

            {/* Info Card */}
          <Card className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
            <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-100 mb-2">
              How to Use
            </h3>
            <ul className="text-xs text-primary-700 dark:text-primary-300 space-y-1">
              <li>1. Click "Connect & Start"</li>
              <li>2. Allow microphone access</li>
              <li>3. Start speaking when ready</li>
              <li>4. View transcriptions in real-time</li>
              <li>5. Hear AI responses automatically</li>
            </ul>
          </Card>

          {/* Connection Info */}
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Connection Info
            </h3>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p>
                <span className="font-medium">AI Service:</span>{' '}
                {process.env.NEXT_PUBLIC_AI_SERVICE_WS_URL || 'ws://localhost:8000'}
              </p>
              <p>
                <span className="font-medium">Session ID:</span>{' '}
                {sessionIdRef.current}
              </p>
              {!isConnected && (
                <p className="text-warning-600 dark:text-warning-400 mt-2">
                  ⚠️ Make sure the AI service is running
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
