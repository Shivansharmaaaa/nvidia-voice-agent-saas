import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createDto: CreateOrganizationDto) {
    // In development mode, ensure user exists
    if (userId === 'dev-user-id') {
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!existingUser) {
        // Create dev user if it doesn't exist
        await this.prisma.user.create({
          data: {
            id: userId,
            email: 'dev@example.com',
            name: 'Dev User',
            authId: 'dev-auth-id',
          },
        });
      }
    }
    
    const org = await this.prisma.organization.create({
      data: {
        name: createDto.name,
        slug: createDto.slug,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    return org;
  }

  async findAll(userId: string) {
    return this.prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            agents: true,
            callSessions: true,
          },
        },
      },
    });
  }

  async findOne(userId: string, id: string) {
    await this.ensureAccess(userId, id);
    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        agents: true,
      },
    });
  }

  async update(userId: string, id: string, updateDto: UpdateOrganizationDto) {
    await this.ensureAdminAccess(userId, id);
    return this.prisma.organization.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwnerAccess(userId, id);
    return this.prisma.organization.delete({
      where: { id },
    });
  }

  private async ensureAccess(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('No access to this organization');
    }
  }

  private async ensureAdminAccess(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenException('Admin access required');
    }
  }

  private async ensureOwnerAccess(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership || membership.role !== 'owner') {
      throw new ForbiddenException('Owner access required');
    }
  }
}
