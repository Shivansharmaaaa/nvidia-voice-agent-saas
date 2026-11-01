'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, ArrowRight, ArrowLeft, Sparkles, FileText, Mic, Settings, Eye } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface AgentWizardProps {
  agent: any
  onUpdate: (data: any) => void
  onDeploy: () => void
}

const steps = [
  { id: 1, name: 'Persona', description: 'Business info & industry', icon: Sparkles },
  { id: 2, name: 'Knowledge', description: 'FAQs & scripts', icon: FileText },
  { id: 3, name: 'Voice', description: 'Voice preferences', icon: Mic },
  { id: 4, name: 'Dialogue', description: 'Rules & escalations', icon: Settings },
  { id: 5, name: 'Review', description: 'Review & deploy', icon: Eye },
]

export function AgentWizard({ agent, onUpdate, onDeploy }: AgentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    businessName: agent.businessName || '',
    industry: agent.industry || '',
    persona: agent.persona || {},
    knowledgeBase: agent.knowledgeBase || { faqs: [], scripts: [] },
    voiceSettings: agent.voiceSettings || { speed: 1.0, pitch: 1.0 },
    language: agent.language || 'en-US',
    dialogueRules: agent.dialogueRules || {},
    systemPrompt: agent.systemPrompt || '',
  })

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      onUpdate(formData)
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleDeploy = () => {
    onUpdate(formData)
    onDeploy()
  }

  const currentStepData = steps[currentStep - 1]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Configure Agent
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Step {currentStep} of {steps.length}: {currentStepData.name}
            </p>
          </div>
          <Badge variant="info">Draft</Badge>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const StepIcon = step.icon
            const isComplete = currentStep > step.id
            const isCurrent = currentStep === step.id
            const isPending = currentStep < step.id

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      'relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all',
                      isComplete
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : isCurrent
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-600 text-primary-600 dark:text-primary-400'
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-400'
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        isCurrent
                          ? 'text-primary-600 dark:text-primary-400'
                          : isComplete
                          ? 'text-gray-900 dark:text-gray-100'
                          : 'text-gray-500 dark:text-gray-400'
                      )}
                    >
                      {step.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-4 -mt-6',
                      isComplete ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-800'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card className="min-h-[400px]">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Agent Persona
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Define your agent's personality and business context
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => updateField('businessName', e.target.value)}
                  className="input"
                  placeholder="Acme Corporation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Industry
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => updateField('industry', e.target.value)}
                  className="input"
                >
                  <option value="">Select industry</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="retail">Retail</option>
                  <option value="finance">Finance</option>
                  <option value="technology">Technology</option>
                  <option value="real-estate">Real Estate</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Knowledge Base
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Provide information your agent needs to answer questions
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  System Prompt
                </label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => updateField('systemPrompt', e.target.value)}
                  rows={8}
                  className="input font-mono text-sm"
                  placeholder="You are a helpful assistant for..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  Define your agent's role and behavior
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  FAQs (one per line)
                </label>
                <textarea
                  value={formData.knowledgeBase.faqs?.join('\n') || ''}
                  onChange={(e) =>
                    updateField('knowledgeBase', {
                      ...formData.knowledgeBase,
                      faqs: e.target.value.split('\n').filter((f) => f.trim()),
                    })
                  }
                  rows={6}
                  className="input font-mono text-sm"
                  placeholder="Q: What are your hours?&#10;A: We're open Monday-Friday 9am-5pm..."
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Voice Settings
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Customize how your agent sounds
              </p>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Language
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => updateField('language', e.target.value)}
                  className="input"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-ES">Spanish</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Speech Speed
                  </label>
                  <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                    {formData.voiceSettings.speed}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={formData.voiceSettings.speed}
                  onChange={(e) =>
                    updateField('voiceSettings', {
                      ...formData.voiceSettings,
                      speed: parseFloat(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Slower</span>
                  <span>Faster</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pitch
                  </label>
                  <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                    {formData.voiceSettings.pitch}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={formData.voiceSettings.pitch}
                  onChange={(e) =>
                    updateField('voiceSettings', {
                      ...formData.voiceSettings,
                      pitch: parseFloat(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Lower</span>
                  <span>Higher</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Dialogue Rules
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure how your agent handles conversations
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Escalation Email
                </label>
                <input
                  type="email"
                  value={formData.dialogueRules.escalationEmail || ''}
                  onChange={(e) =>
                    updateField('dialogueRules', {
                      ...formData.dialogueRules,
                      escalationEmail: e.target.value,
                    })
                  }
                  className="input"
                  placeholder="support@example.com"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  Notifications sent here when human takeover is needed
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Call Duration (seconds)
                </label>
                <input
                  type="number"
                  value={formData.dialogueRules.maxDuration || 300}
                  onChange={(e) =>
                    updateField('dialogueRules', {
                      ...formData.dialogueRules,
                      maxDuration: parseInt(e.target.value),
                    })
                  }
                  className="input"
                  min="60"
                  max="3600"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Review & Deploy
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Review your configuration and deploy your agent
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Business Name
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formData.businessName || 'Not set'}
                </p>
              </div>
              <div className="card p-4 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Industry
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formData.industry || 'Not set'}
                </p>
              </div>
              <div className="card p-4 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Language
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formData.language}
                </p>
              </div>
              <div className="card p-4 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Voice Speed
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formData.voiceSettings.speed}x
                </p>
              </div>
            </div>
            {formData.dialogueRules.escalationEmail && (
              <div className="card p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                <p className="text-xs font-medium text-primary-700 dark:text-primary-300 mb-1">
                  Escalation Email
                </p>
                <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                  {formData.dialogueRules.escalationEmail}
                </p>
              </div>
            )}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={handleDeploy}
                className="w-full btn-primary py-3 text-base"
              >
                Deploy Agent
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation */}
      {currentStep < 5 && (
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </button>
          <button
            onClick={handleNext}
            className="btn-primary flex items-center"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </button>
        </div>
      )}
    </div>
  )
}
