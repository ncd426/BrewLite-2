import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';

import { type VnpayParams } from './payment-gateways';
import { PaymentsService } from './payments.service';

@Controller('payments/webhooks')
export class PaymentsWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('vnpay')
  vnpay(@Query() params: VnpayParams) {
    return this.paymentsService.handleVnpayIpn(params);
  }
}