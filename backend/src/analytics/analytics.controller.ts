import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('analytics')
@Controller('organizations/:organizationId/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get organization analytics' })
  getOrganizationAnalytics(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const dateRange = start && end
      ? { start: new Date(start), end: new Date(end) }
      : undefined;

    return this.analyticsService.getOrganizationAnalytics(
      req.user.id,
      organizationId,
      dateRange,
    );
  }

  @Get('agents/:agentId')
  @ApiOperation({ summary: 'Get agent analytics' })
  getAgentAnalytics(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('agentId') agentId: string,
  ) {
    return this.analyticsService.getAgentAnalytics(
      req.user.id,
      organizationId,
      agentId,
    );
  }
}
