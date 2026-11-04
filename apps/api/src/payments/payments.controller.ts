
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PaymentsService } from './payments.service';

class PaymentDto {
  @IsInt()
  @Min(1)
  orderId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  amount?: number;

  @IsIn(['MOMO', 'CARD'])
  method!: 'MOMO' | 'CARD';

  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  pointsToRedeem?: number;
}

type AuthenticatedUser = {
  userId: number;
};

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post()
  pay(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const key = idempotencyKey?.trim();

    if (!key || key.length > 128) {
      throw new BadRequestException(
        'Valid Idempotency-Key header is required',
      );
    }

    return this.paymentsService.processPayment(
      user.userId,
      dto.orderId,
      dto.amount,
      dto.method,
      key,
      dto.simulateFailure ?? false,
      dto.pointsToRedeem ?? 0,
    );
  }
}
