import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('webhook/clerk')
  @ApiOperation({ summary: 'Clerk webhook for user sync' })
  async clerkWebhook(@Body() body: any) {
    // Handle Clerk webhook events
    if (body.type === 'user.created' || body.type === 'user.updated') {
      const user = await this.authService.validateUser(
        body.data.id,
        body.data.email_addresses[0]?.email_address,
        `${body.data.first_name} ${body.data.last_name}`.trim(),
      );
      return { user };
    }
    return { received: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  async getMe(@Request() req) {
    return req.user;
  }

  @Get('organizations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user organizations' })
  async getOrganizations(@Request() req) {
    return this.authService.getUserOrganizations(req.user.id);
  }
}
