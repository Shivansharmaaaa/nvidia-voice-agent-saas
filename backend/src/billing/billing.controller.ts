import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { UsageService } from './usage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('billing')
@Controller('organizations/:organizationId/billing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly usageService: UsageService,
  ) {}

  @Get('subscription')
  @ApiOperation({ summary: 'Get organization subscription' })
  async getSubscription(
    @Request() req,
    @Param('organizationId') organizationId: string,
  ) {
    return this.billingService.getSubscription(organizationId);
  }

  @Post('upgrade')
  @ApiOperation({ summary: 'Upgrade subscription plan' })
  async upgradePlan(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() body: { planName: string; paymentMethodId?: string },
  ) {
    return this.billingService.upgradePlan(
      organizationId,
      body.planName,
      body.paymentMethodId,
    );
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() body: { cancelAtPeriodEnd?: boolean },
  ) {
    return this.billingService.cancelSubscription(
      organizationId,
      body.cancelAtPeriodEnd ?? true,
    );
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get usage summary' })
  async getUsage(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() body: { startDate?: string; endDate?: string },
  ) {
    const startDate = body.startDate
      ? new Date(body.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = body.endDate ? new Date(body.endDate) : new Date();

    return this.usageService.getUsageSummary(organizationId, startDate, endDate);
  }

  @Get('limits')
  @ApiOperation({ summary: 'Check usage limits' })
  async checkLimits(
    @Request() req,
    @Param('organizationId') organizationId: string,
  ) {
    return this.billingService.checkUsageLimits(organizationId);
  }
}
