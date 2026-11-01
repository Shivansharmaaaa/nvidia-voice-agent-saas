import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EnterpriseService } from './enterprise.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Response } from 'express';

@ApiTags('enterprise')
@Controller('organizations/:organizationId/enterprise')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EnterpriseController {
  constructor(private readonly enterpriseService: EnterpriseService) {}

  @Post('sso')
  @ApiOperation({ summary: 'Configure SSO (SAML/OIDC)' })
  async configureSSO(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() config: any,
  ) {
    return this.enterpriseService.configureSSO(organizationId, config);
  }

  @Post('ip-allowlist')
  @ApiOperation({ summary: 'Configure IP allowlisting' })
  async configureIPAllowlist(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() body: { allowedIPs: string[] },
  ) {
    return this.enterpriseService.configureIPAllowlist(
      organizationId,
      body.allowedIPs,
    );
  }

  @Post('data-retention')
  @ApiOperation({ summary: 'Configure custom data retention' })
  async configureDataRetention(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() body: { retentionDays: number },
  ) {
    return this.enterpriseService.configureDataRetention(
      organizationId,
      body.retentionDays,
    );
  }

  @Post('dedicated-gpu')
  @ApiOperation({ summary: 'Request dedicated GPU pool' })
  async requestDedicatedGPU(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() body: { gpuCount: number },
  ) {
    return this.enterpriseService.requestDedicatedGPU(
      organizationId,
      body.gpuCount,
    );
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Export audit logs' })
  async exportAuditLogs(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Res() res?: Response,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const result = await this.enterpriseService.exportAuditLogs(
      organizationId,
      start,
      end,
      format,
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="audit-logs-${Date.now()}.csv"`,
      );
      return res.send(result);
    }

    return result;
  }
}
