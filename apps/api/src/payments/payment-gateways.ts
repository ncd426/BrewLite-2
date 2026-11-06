import { createHmac, timingSafeEqual } from 'node:crypto';

type VnpayPayment = {
  id: number;
  orderId: number;
  amount: number;
  pointsUsed: number;
  expiresAt: Date;
};

type VnpayConfig = {
  tmnCode: string;
  hashSecret: string;
  payUrl: string;
  returnUrl: string;
};

export type VnpayParams = Record<string, string | string[] | undefined>;

function vnpayDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
}

export function createVnpaySignature(
  params: Record<string, string>,
  secret: string,
): string {
  const canonical = new URLSearchParams(
    Object.entries(params).sort(([left], [right]) => left.localeCompare(right)),
  ).toString();
  return createHmac('sha512', secret).update(canonical, 'utf8').digest('hex');
}

export function createVnpayPaymentUrl(
  payment: VnpayPayment,
  clientIp: string,
  config: VnpayConfig = {
    tmnCode: process.env.VNPAY_TMN_CODE ?? '',
    hashSecret: process.env.VNPAY_HASH_SECRET ?? '',
    payUrl: process.env.VNPAY_PAY_URL ?? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: process.env.VNPAY_RETURN_URL ?? 'http://localhost:3000/checkout/qr',
  },
  now = new Date(),
): string {
  if (!config.tmnCode || !config.hashSecret) {
    throw new Error('VNPay sandbox credentials are not configured');
  }

  const returnUrl = new URL(config.returnUrl);
  returnUrl.searchParams.set('orderId', String(payment.orderId));
  returnUrl.searchParams.set('method', 'VNPAY');
  returnUrl.searchParams.set('points', String(payment.pointsUsed));

  const params: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: config.tmnCode,
    vnp_Amount: String(payment.amount * 100),
    vnp_CreateDate: vnpayDate(now),
    vnp_CurrCode: 'VND',
    vnp_IpAddr: clientIp,
    vnp_Locale: 'vn',
    vnp_OrderInfo: `Thanh toan don hang BrewLite ${payment.orderId}`,
    vnp_OrderType: 'other',
    vnp_ReturnUrl: returnUrl.toString(),
    vnp_TxnRef: String(payment.id),
    vnp_ExpireDate: vnpayDate(payment.expiresAt),
    // vnp_BankCode: 'VNPAYQR',
  };

  const url = new URL(config.payUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('vnp_SecureHash', createVnpaySignature(params, config.hashSecret));
  return url.toString();
}

export function verifyVnpaySignature(
  params: VnpayParams,
  hashSecret: string,
): boolean {
  const received = params.vnp_SecureHash;
  if (typeof received !== 'string' || !/^[a-f\d]{128}$/i.test(received)) {
    return false;
  }

  const signedParams = Object.fromEntries(
    Object.entries(params).flatMap(([key, value]) =>
      key.startsWith('vnp_') &&
      key !== 'vnp_SecureHash' &&
      key !== 'vnp_SecureHashType' &&
      typeof value === 'string'
        ? [[key, value]]
        : [],
    ),
  );
  const expected = createVnpaySignature(signedParams, hashSecret);
  return timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
}

