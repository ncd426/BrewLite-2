import { RolesGuard } from '../common/guards/roles.guard';
import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PromotionPreviewController } from './promotion-preview.controller';
import { PromotionPreviewService } from './promotion-preview.service';

@Module({
  controllers: [OrdersController, PromotionPreviewController],
  providers: [OrdersService, PromotionPreviewService, RolesGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
