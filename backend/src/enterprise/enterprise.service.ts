import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnterpriseService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if organization has enterprise features
   */
  async hasEnterpriseFeatures(organizationId: string): Promise<boolean> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    return org?.subscription?.plan?.name === 'enterprise';
  }

  /**
   * Configure SSO for organization
   */
  async configureSSO(
    organizationId: string,
    config: {
      provider: 'saml' | 'oidc';
      ssoUrl: string;
      entityId?: string;
      certificate?: string;
    },
  ) {
    await this.ensureEnterprise(organizationId);

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          sso: {
            enabled: true,
            provider: config.provider,
            ssoUrl: config.ssoUrl,
            entityId: config.entityId,
            certificate: config.certificate,
          },
        },
      },
    });
  }

  /**
   * Configure IP allowlisting
   */
  async configureIPAllowlist(
    organizationId: string,
    allowedIPs: string[],
  ) {
    await this.ensureEnterprise(organizationId);

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ipAllowlist: {
            enabled: true,
            allowedIPs,
          },
        },
      },
    });
  }

  /**
   * Configure custom data retention
   */
  async configureDataRetention(
    organizationId: string,
    retentionDays: number,
  ) {
    await this.ensureEnterprise(organizationId);

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          dataRetention: {
            enabled: true,
            retentionDays,
          },
        },
      },
    });
  }

  /**
   * Request dedicated GPU pool
   */
  async requestDedicatedGPU(organizationId: string, gpuCount: number) {
    await this.ensureEnterprise(organizationId);

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          dedicatedGPU: {
            enabled: true,
            gpuCount,
            requestedAt: new Date().toISOString(),
          },
        },
      },
    });
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json',
  ) {
    await this.ensureEnterprise(organizationId);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'csv') {
      return this.formatAuditLogsCSV(logs);
    }

    return {
      organizationId,
      period: { startDate, endDate },
      totalLogs: logs.length,
      logs,
    };
  }

  private formatAuditLogsCSV(logs: any[]): string {
    const headers = [
      'Timestamp',
      'User Email',
      'Action',
      'Resource',
      'Resource ID',
      'IP Address',
      'Details',
    ];

    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.user?.email || 'N/A',
      log.action,
      log.resource,
      log.resourceId || 'N/A',
      log.ipAddress || 'N/A',
      JSON.stringify(log.details || {}),
    ]);

    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');
  }

  private async ensureEnterprise(organizationId: string) {
    const hasEnterprise = await this.hasEnterpriseFeatures(organizationId);
    if (!hasEnterprise) {
      throw new ForbiddenException(
        'Enterprise features require Enterprise plan',
      );
    }
  }
}
