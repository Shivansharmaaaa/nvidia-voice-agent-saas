import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgentsService } from '../agents/agents.service';

export interface AgentTemplate {
  name: string;
  description: string;
  industry: string;
  systemPrompt: string;
  knowledgeBase: any;
  dialogueRules: any;
}

@Injectable()
export class OnboardingService {
  private templates: AgentTemplate[] = [
    {
      name: 'Customer Support Agent',
      description: 'Handles customer inquiries, troubleshooting, and support tickets',
      industry: 'technology',
      systemPrompt: `You are a helpful customer support agent. Your role is to:
- Answer customer questions clearly and concisely
- Troubleshoot technical issues step-by-step
- Escalate complex issues when needed
- Maintain a friendly and professional tone

Always ask clarifying questions if you need more information.`,
      knowledgeBase: {
        faqs: [
          'Q: How do I reset my password?\nA: Visit our login page and click "Forgot Password". Enter your email to receive a reset link.',
          'Q: What are your business hours?\nA: We are available Monday-Friday, 9am-5pm EST. For urgent issues, contact our 24/7 emergency line.',
          'Q: Do you offer refunds?\nA: Yes, we offer a 30-day money-back guarantee. Contact support to initiate a refund.',
        ],
      },
      dialogueRules: {
        escalationEmail: 'support@example.com',
        maxDuration: 600,
        greeting: 'Hello! How can I help you today?',
      },
    },
    {
      name: 'Sales Agent',
      description: 'Qualifies leads, answers product questions, and schedules demos',
      industry: 'sales',
      systemPrompt: `You are a sales agent. Your role is to:
- Qualify leads and understand their needs
- Answer product questions accurately
- Schedule demos and follow-ups
- Be consultative, not pushy

Focus on understanding the customer's pain points and how our solution can help.`,
      knowledgeBase: {
        faqs: [
          'Q: What are your pricing plans?\nA: We offer three plans: Starter ($99/mo), Professional ($299/mo), and Enterprise (custom pricing).',
          'Q: Do you offer a free trial?\nA: Yes, we offer a 14-day free trial with full access to all features.',
          'Q: Can I schedule a demo?\nA: Absolutely! I can schedule a personalized demo for you. What time works best?',
        ],
      },
      dialogueRules: {
        escalationEmail: 'sales@example.com',
        maxDuration: 900,
        greeting: 'Hi! Thanks for your interest. I\'d love to learn more about your needs.',
      },
    },
    {
      name: 'Appointment Booking Agent',
      description: 'Schedules appointments, manages calendars, and sends confirmations',
      industry: 'healthcare',
      systemPrompt: `You are an appointment booking agent. Your role is to:
- Help customers schedule appointments
- Check availability in real-time
- Confirm appointment details
- Send reminders and handle rescheduling

Be clear about available time slots and confirm all details before booking.`,
      knowledgeBase: {
        faqs: [
          'Q: What are your available appointment times?\nA: We have availability Monday-Friday, 9am-5pm. Same-day appointments may be available.',
          'Q: Can I reschedule my appointment?\nA: Yes, I can help you reschedule. What date and time would work better?',
          'Q: Do you accept insurance?\nA: Yes, we accept most major insurance plans. I can verify your coverage when you arrive.',
        ],
      },
      dialogueRules: {
        escalationEmail: 'scheduling@example.com',
        maxDuration: 300,
        greeting: 'Hello! I can help you schedule an appointment. What type of appointment do you need?',
      },
    },
  ];

  constructor(
    private prisma: PrismaService,
    private agentsService: AgentsService,
  ) {}

  async getTemplates(): Promise<AgentTemplate[]> {
    return this.templates;
  }

  async createFromTemplate(
    userId: string,
    organizationId: string,
    templateName: string,
    customizations?: Partial<AgentTemplate>,
  ) {
    const template = this.templates.find((t) => t.name === templateName);
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    const agentData = {
      ...template,
      ...customizations,
    };

    return this.agentsService.create(userId, organizationId, agentData);
  }

  async getOnboardingProgress(userId: string, organizationId: string) {
    const [org, agents, calls] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: { members: { where: { userId } } },
      }),
      this.prisma.agent.count({ where: { organizationId } }),
      this.prisma.callSession.count({ where: { organizationId } }),
    ]);

    const steps = [
      {
        id: 'create_org',
        completed: !!org,
        title: 'Create Organization',
      },
      {
        id: 'create_agent',
        completed: agents > 0,
        title: 'Create Your First Agent',
      },
      {
        id: 'configure_agent',
        completed: agents > 0, // Simplified - would check if agent is configured
        title: 'Configure Agent Settings',
      },
      {
        id: 'deploy_agent',
        completed: agents > 0 && calls > 0, // Simplified
        title: 'Deploy and Test Agent',
      },
    ];

    const completedSteps = steps.filter((s) => s.completed).length;
    const progress = (completedSteps / steps.length) * 100;

    return {
      steps,
      progress,
      completedSteps,
      totalSteps: steps.length,
    };
  }
}
