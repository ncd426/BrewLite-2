import { Type } from 'class-transformer';
import {
  ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsEnum,
  IsIn, IsInt, IsNotEmpty, IsOptional, IsString,
  Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { OrderStatus, UserRole } from '@prisma/client';
import { CreateOrderItemDto } from '../orders/dto/create-order.dto';

export class AdvanceOrderDto {
  @IsEnum(OrderStatus)
  @IsIn([OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED])
  status!: OrderStatus;
}

export class SetRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}

export class RecipeLineDto {
  @IsInt() @Min(1) ingredientId!: number;
  @IsInt() @Min(1) @Max(1000000) quantity!: number;
  @IsOptional() @IsBoolean() isOptional?: boolean;
}

export class CreateProductDto {
  @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @IsInt() @Min(0) @Max(2147483647) price!: number;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsString() @MaxLength(600) description?: string;
  @IsOptional() @IsString() @MaxLength(2000) imageUrl?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true })
  @Type(() => RecipeLineDto) recipe!: RecipeLineDto[];
}

export class UpdateProductDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) name?: string;
  @IsOptional() @IsInt() @Min(0) @Max(2147483647) price?: number;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsString() @MaxLength(600) description?: string;
  @IsOptional() @IsString() @MaxLength(2000) imageUrl?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true }) @Type(() => RecipeLineDto)
  recipe?: RecipeLineDto[];
}

export class CreateIngredientDto {
  @IsString() @IsNotEmpty() @MaxLength(60) code!: string;
  @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @IsString() @IsNotEmpty() @MaxLength(30) unit!: string;
  @IsInt() @Min(0) @Max(2147483647) stockQuantity!: number;
  @IsInt() @Min(0) @Max(2147483647) minStock!: number;
  @IsOptional() @IsInt() @Min(0) @Max(2147483647) importPrice?: number;
}

export class AdjustInventoryDto {
  @IsInt() @Min(-1000000) @Max(1000000) delta!: number;
  @IsOptional() @IsInt() @Min(0) @Max(2147483647) minStock?: number;
}

// A counter sale is NOT a customer online order. These items are validated
// with the same product/size/topping rules as the online checkout.
export class CreateCounterSaleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsIn(['CASH', 'CARD'])
  method!: 'CASH' | 'CARD';
}
