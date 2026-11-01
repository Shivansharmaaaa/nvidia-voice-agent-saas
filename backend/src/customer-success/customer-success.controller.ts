import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerSuccessService } from './customer-success.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('customer-success')
@Controller('organizations/:organizationId/customer-success')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomerSuccessController {
  constructor(
    private readonly customerSuccessService: CustomerSuccessService,
  ) {}

  @Get('health-score')
  @ApiOperation({ summary: 'Get customer health score' })
  async getHealthScore(
    @Request() req,
    @Param('organizationId') organizationId: string,
  ) {
    return this.customerSuccessService.calculateHealthScore(organizationId);
  }

  @Get('onboarding-checklist')
  @ApiOperation({ summary: 'Get onboarding checklist' })
  async getOnboardingChecklist(
    @Request() req,
    @Param('organizationId') organizationId: string,
  ) {
    return this.customerSuccessService.getOnboardingChecklist(organizationId);
  }

  @Get('success-plan')
  @ApiOperation({ summary: 'Get 30-60-90 day success plan' })
  async getSuccessPlan(
    @Request() req,
    @Param('organizationId') organizationId: string,
  ) {
    return this.customerSuccessService.getSuccessPlan(organizationId);
  }

  @Get('churn-risk')
  @ApiOperation({ summary: 'Identify churn risk' })
  async getChurnRisk(
    @Request() req,
    @Param('organizationId') organizationId: string,
  ) {
    return this.customerSuccessService.identifyChurnRisk(organizationId);
  }
}
