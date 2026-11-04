import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type UserRecord = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  loyaltyPoints: number;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    user: Pick<UserRecord, 'name' | 'email' | 'passwordHash'>,
  ): Promise<UserRecord> {
    return this.prisma.user.create({
      data: user,
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        loyaltyPoints: true,
      },
    });
  }

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        loyaltyPoints: true,
      },
    });
  }

  findPublicById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        loyaltyPoints: true,
        role: true,
        createdAt: true,
      },
    });
  }
}
