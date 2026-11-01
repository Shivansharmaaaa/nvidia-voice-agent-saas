import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CostCalculatorService } from './cost-calculator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('cost')
@Controller('organizations/:organizationId/cost')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CostController {
  constructor(private readonly costCalculator: CostCalculatorService) {}

  @Get('analysis')
  @ApiOperation({ summary: 'Get cost analysis for organization' })
  async getCostAnalysis(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.costCalculator.getOrganizationCostAnalysis(organizationId, start, end);
  }

  @Get('calls/:callId')
  @ApiOperation({ summary: 'Get cost breakdown for a call' })
  async getCallCost(
    @Request() req,
    @Param('callId') callId: string,
  ) {
    return this.costCalculator.getCallCostBreakdown(callId);
  }

  @Get('pricing')
  @ApiOperation({ summary: 'Get recommended pricing' })
  async getRecommendedPricing(@Query('targetMargin') targetMargin?: string) {
    const margin = targetMargin ? parseFloat(targetMargin) : 70;
    return this.costCalculator.getRecommendedPricing(margin);
  }
}
