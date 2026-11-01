'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, ArrowRight, ArrowLeft } from 'lucide-react'

interface AgentWizardProps {
  agent: any
  onUpdate: (data: any) => void
  onDeploy: () => void
}

const steps = [
  { id: 1, name: 'Persona', description: 'Business info & industry' },
  { id: 2, name: 'Knowledge', description: 'FAQs & scripts' },
  { id: 3, name: 'Voice', description: 'Voice preferences' },
  { id: 4, name: 'Dialogue', description: 'Rules & escalations' },
  { id: 5, name: 'Review', description: 'Review & deploy' },
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep > step.id
                      ? 'bg-primary-600 text-white'
                      : currentStep === step.id
                      ? 'bg-primary-100 text-primary-600 border-2 border-primary-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {currentStep > step.id ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <Circle className="h-6 w-6" />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className="text-sm font-medium text-gray-900">{step.name}</p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    currentStep > step.id ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Agent Persona</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => updateField('businessName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Acme Corporation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <select
                value={formData.industry}
                onChange={(e) => updateField('industry', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Knowledge Base</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt
              </label>
              <textarea
                value={formData.systemPrompt}
                onChange={(e) => updateField('systemPrompt', e.target.value)}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="You are a helpful assistant for..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Q: What are your hours?\nA: We're open Monday-Friday 9am-5pm..."
              />
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Voice Settings</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={formData.language}
                onChange={(e) => updateField('language', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Spanish</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Speech Speed: {formData.voiceSettings.speed}x
              </label>
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
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pitch: {formData.voiceSettings.pitch}x
              </label>
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
                className="w-full"
              />
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Dialogue Rules</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="support@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Review & Deploy</h2>
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <strong>Business Name:</strong> {formData.businessName || 'Not set'}
              </div>
              <div>
                <strong>Industry:</strong> {formData.industry || 'Not set'}
              </div>
              <div>
                <strong>Language:</strong> {formData.language}
              </div>
              <div>
                <strong>Voice Speed:</strong> {formData.voiceSettings.speed}x
              </div>
              {formData.dialogueRules.escalationEmail && (
                <div>
                  <strong>Escalation Email:</strong>{' '}
                  {formData.dialogueRules.escalationEmail}
                </div>
              )}
            </div>
            <button
              onClick={handleDeploy}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold"
            >
              Deploy Agent
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      {currentStep < 5 && (
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </button>
          <button
            onClick={handleNext}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </button>
        </div>
      )}
    </div>
  )
}
