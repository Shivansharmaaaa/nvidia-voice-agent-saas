import { Controller, Post, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DemoService } from './demo.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('demo')
@Controller('demo')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create demo organization with sample agent' })
  async createDemo(@Request() req) {
    return this.demoService.createDemoOrganization(req.user.id);
  }

  @Post('organizations/:organizationId/reset')
  @ApiOperation({ summary: 'Reset demo organization' })
  async resetDemo(
    @Request() req,
    @Param('organizationId') organizationId: string,
  ) {
    return this.demoService.resetDemo(organizationId);
  }
}
