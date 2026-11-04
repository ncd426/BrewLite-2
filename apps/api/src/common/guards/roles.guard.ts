import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowed = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed?.length) return true;

    // Never use role supplied in a JWT or request body. Resolve it from DB
    // on every protected request, so changes/revocations take effect at once.
    const { user } = context.switchToHttp().getRequest<{
      user?: { userId?: number };
    }>();
    if (!Number.isSafeInteger(user?.userId) || (user?.userId ?? 0) < 1) {
      throw new UnauthorizedException('Sign in to continue');
    }

    const account = await this.prisma.user.findUnique({
      where: { id: user!.userId! },
      select: { role: true },
    });
    if (!account) throw new UnauthorizedException('User no longer exists');
    if (!allowed.includes(account.role)) {
      throw new ForbiddenException('You do not have permission for this action');
    }
    return true;
  }
}
