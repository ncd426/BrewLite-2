
import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

type AuthenticatedUser = {
  userId: number;
  email: string;
};

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create({
      userId: user.userId,
      items: dto.items,
      promotionCode: dto.promotionCode,
    });
  }

  
  @Get('me')
  getMyOrders(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.getMyOrders(
      user.userId,
    );
  }

  
@Get(':id')
getOrderById(
  @CurrentUser() user: AuthenticatedUser,
  @Param('id', ParseIntPipe) orderId: number,
) {
  return this.ordersService.getOrderById(
    user.userId,
    orderId,
  );
}

@Post(':id/cancel')
cancelMyOrder(
  @CurrentUser() user: AuthenticatedUser,
  @Param('id', ParseIntPipe) orderId: number,
) {
  return this.ordersService.cancelMyOrder(user.userId, orderId);
}

}
