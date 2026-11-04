import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Patch, Post, UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BackofficeService } from './backoffice.service';
import {
  AdjustInventoryDto, CreateIngredientDto,
  CreateProductDto, SetRoleDto, UpdateProductDto,
} from './dto';

@Controller('management/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly service: BackofficeService) {}

  @Get('overview') overview() { return this.service.overview(); }
  @Get('users') users() { return this.service.listUsers(); }
  @Patch('users/:id/role')
  setRole(
    @CurrentUser() current: { userId: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetRoleDto,
  ) {
    return this.service.setUserRole(current.userId, id, dto.role);
  }

  @Get('products') products() { return this.service.listProducts(); }
  @Post('products') productCreate(@Body() dto: CreateProductDto) { return this.service.createProduct(dto); }
  @Patch('products/:id') productUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) { return this.service.updateProduct(id, dto); }
  @Delete('products/:id') productDelete(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteProduct(id);
  }

  @Get('inventory') inventory() { return this.service.listInventory(); }
  @Post('inventory') inventoryCreate(@Body() dto: CreateIngredientDto) {
    return this.service.createIngredient(dto);
  }
  @Patch('inventory/:id') inventoryAdjust(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustInventoryDto,
  ) { return this.service.adjustInventory(id, dto); }
}
