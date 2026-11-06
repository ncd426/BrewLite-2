import {
  createVnpayPaymentUrl,
  verifyVnpaySignature,
} from './payment-gateways';

describe('VNPay sandbox signing', () => {
  const config = {
    tmnCode: 'TESTCODE',
    hashSecret: 'sandbox-secret',
    payUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: 'https://shop.example/checkout/qr',
  };

  it('creates a signed VNPay URL with amount and expiry without forcing a bank', () => {
    const url = new URL(
      createVnpayPaymentUrl(
        {
          id: 17,
          orderId: 42,
          amount: 94000,
          pointsUsed: 0,
          expiresAt: new Date('2026-11-05T05:15:00.000Z'),
        },
        '127.0.0.1',
        config,
        new Date('2026-11-05T05:00:00.000Z'),
      ),
    );

    expect(url.searchParams.get('vnp_Amount')).toBe('9400000');
    expect(url.searchParams.has('vnp_BankCode')).toBe(false);
    expect(url.searchParams.get('vnp_TxnRef')).toBe('17');
    expect(url.searchParams.get('vnp_ExpireDate')).toBe('20261105121500');
    expect(verifyVnpaySignature(Object.fromEntries(url.searchParams), config.hashSecret)).toBe(true);

    url.searchParams.set('vnp_Amount', '100');
    expect(verifyVnpaySignature(Object.fromEntries(url.searchParams), config.hashSecret)).toBe(false);
  });

  it('refuses to create a checkout URL without sandbox credentials', () => {
    expect(() =>
      createVnpayPaymentUrl(
        {
          id: 17,
          orderId: 42,
          amount: 94000,
          pointsUsed: 0,
          expiresAt: new Date('2026-11-05T05:15:00.000Z'),
        },
        '127.0.0.1',
        { ...config, hashSecret: '' },
      ),
    ).toThrow('VNPay sandbox credentials are not configured');
  });

});