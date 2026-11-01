import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(authId: string, email: string, name?: string) {
    let user = await this.prisma.user.findUnique({
      where: { authId },
    });

    if (!user) {
      // Create user if doesn't exist
      user = await this.prisma.user.create({
        data: {
          authId,
          email,
          name,
        },
      });
    } else if (name && user.name !== name) {
      // Update user name if changed
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
    }

    return user;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, authId: user.authId };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async getUserOrganizations(userId: string) {
    return this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
    });
  }
}
