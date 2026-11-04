import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { PromotionPreviewService } from './promotion-preview.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class PromotionPreviewController {
  constructor(private readonly service: PromotionPreviewService) {}

  // This endpoint computes a quote; it never creates an order or reserves stock.
  @Post('promotion-preview')
  preview(@Body() dto: CreateOrderDto) {
    return this.service.preview(dto);
  }
}
