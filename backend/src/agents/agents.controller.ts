import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { CloneAgentDto } from './dto/clone-agent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('agents')
@Controller('organizations/:organizationId/agents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new agent' })
  create(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createDto: CreateAgentDto,
  ) {
    return this.agentsService.create(req.user.id, organizationId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all agents in organization' })
  findAll(@Request() req, @Param('organizationId') organizationId: string) {
    return this.agentsService.findAll(req.user.id, organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent by ID' })
  findOne(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.agentsService.findOne(req.user.id, organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update agent' })
  update(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateAgentDto,
  ) {
    return this.agentsService.update(req.user.id, organizationId, id, updateDto);
  }

  @Post(':id/deploy')
  @ApiOperation({ summary: 'Deploy agent (assign phone number)' })
  deploy(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.agentsService.deploy(req.user.id, organizationId, id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause agent' })
  pause(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.agentsService.pause(req.user.id, organizationId, id);
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone agent' })
  clone(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() cloneDto: CloneAgentDto,
  ) {
    return this.agentsService.clone(req.user.id, organizationId, id, cloneDto.name);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete agent' })
  remove(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.agentsService.remove(req.user.id, organizationId, id);
  }
}
