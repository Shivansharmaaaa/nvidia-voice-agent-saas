import { IsString, IsOptional, IsNumber, IsObject, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  persona?: Record<string, any>;

  @ApiProperty({ required: false, default: 'magpie' })
  @IsOptional()
  @IsString()
  voiceModel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  voiceSettings?: Record<string, any>;

  @ApiProperty({ required: false, default: 'en-US' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ required: false, default: 'nemotron-3-nano' })
  @IsOptional()
  @IsString()
  llmModel?: string;

  @ApiProperty({ required: false, default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiProperty({ required: false, default: 500 })
  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  knowledgeBase?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  dialogueRules?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  escalationEmail?: string;
}
