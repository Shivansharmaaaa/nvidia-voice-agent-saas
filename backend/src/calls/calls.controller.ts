import { Controller, Get, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('calls')
@Controller('organizations/:organizationId/calls')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all call sessions' })
  findAll(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query('agentId') agentId?: string,
  ) {
    return this.callsService.findAll(req.user.id, organizationId, agentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get call session by ID' })
  findOne(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.callsService.findOne(req.user.id, organizationId, id);
  }
}
