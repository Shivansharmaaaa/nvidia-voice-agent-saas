import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('onboarding')
@Controller('onboarding')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('templates')
  @ApiOperation({ summary: 'Get available agent templates' })
  async getTemplates() {
    return this.onboardingService.getTemplates();
  }

  @Post('organizations/:organizationId/templates/:templateName')
  @ApiOperation({ summary: 'Create agent from template' })
  async createFromTemplate(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('templateName') templateName: string,
    @Body() customizations?: any,
  ) {
    return this.onboardingService.createFromTemplate(
      req.user.id,
      organizationId,
      templateName,
      customizations,
    );
  }

  @Get('organizations/:organizationId/progress')
  @ApiOperation({ summary: 'Get onboarding progress' })
  async getProgress(
    @Request() req,
    @Param('organizationId') organizationId: string,
  ) {
    return this.onboardingService.getOnboardingProgress(
      req.user.id,
      organizationId,
    );
  }
}
