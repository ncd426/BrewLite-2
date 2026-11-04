import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { StaffController } from './staff.controller';
import { BackofficeService } from './backoffice.service';
import { CounterSalesService } from './counter-sales.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [AuthModule],
  controllers: [AdminController, StaffController],
  providers: [BackofficeService, CounterSalesService, RolesGuard],
})
export class BackofficeModule {}
