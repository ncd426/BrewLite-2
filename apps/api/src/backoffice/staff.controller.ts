import { BadRequestException, Body, Controller, Get, Headers, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CounterSalesService } from './counter-sales.service';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BackofficeService } from './backoffice.service';
import { AdvanceOrderDto, CreateCounterSaleDto } from './dto';

@Controller('management/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAFF, UserRole.ADMIN)
export class StaffController {
  constructor(private readonly service: BackofficeService, private readonly sales: CounterSalesService) {}

  @Post('sales')
  createSale(
    @CurrentUser() user: { userId: number },
    @Body() dto: CreateCounterSaleDto,
    @Headers('idempotency-key') key?: string,
  ) {
    if (!key || key.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(key)) {
      throw new BadRequestException('A valid Idempotency-Key is required');
    }
    return this.sales.create(user.userId, dto, key);
  }

  @Get('orders') orders() { return this.service.listStaffOrders(); }
  @Patch('orders/:id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdvanceOrderDto,
  ) {
    return this.service.advanceOrder(id, dto.status);
  }
}
