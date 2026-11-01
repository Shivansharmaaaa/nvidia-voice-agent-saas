import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('pricing')
@Controller('organizations/:organizationId/pricing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('overage')
  @ApiOperation({ summary: 'Calculate overage charges' })
  async getOverage(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.pricingService.calculateOverage(organizationId, start, end);
  }

  @Get('recommendation')
  @ApiOperation({ summary: 'Get pricing recommendation based on usage' })
  async getRecommendation(
    @Request() req,
    @Param('organizationId') organizationId: string,
  ) {
    return this.pricingService.getPricingRecommendation(organizationId);
  }

  @Get('unit-economics')
  @ApiOperation({ summary: 'Get unit economics for pricing plans' })
  async getUnitEconomics(@Query('plan') plan?: string) {
    if (plan) {
      return this.pricingService.calculateUnitEconomics(plan);
    }
    
    // Return all plans
    return {
      starter: this.pricingService.calculateUnitEconomics('starter'),
      growth: this.pricingService.calculateUnitEconomics('growth'),
      enterprise: this.pricingService.calculateUnitEconomics('enterprise'),
    };
  }
}
