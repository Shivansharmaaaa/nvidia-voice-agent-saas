import { Controller, Get, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Response } from 'express';

@ApiTags('sales')
@Controller('organizations/:organizationId/sales')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('roi')
  @ApiOperation({ summary: 'Calculate ROI vs human agents' })
  async getROI(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query('periodDays') periodDays?: string,
  ) {
    return this.salesService.calculateROI(
      organizationId,
      periodDays ? parseInt(periodDays) : 30,
    );
  }

  @Get('conversions')
  @ApiOperation({ summary: 'Get conversion metrics' })
  async getConversions(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query('periodDays') periodDays?: string,
  ) {
    return this.salesService.getConversionMetrics(
      organizationId,
      periodDays ? parseInt(periodDays) : 30,
    );
  }

  @Get('report')
  @ApiOperation({ summary: 'Generate sales report' })
  async getReport(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Res() res?: Response,
  ) {
    const report = await this.salesService.generateSalesReport(organizationId, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="sales-report-${Date.now()}.csv"`);
      return res.send(report);
    }

    return report;
  }
}
