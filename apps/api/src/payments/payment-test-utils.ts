import { createVnpaySignature } from './payment-gateways';

export function createSignedVnpayIpn(
  paymentId: number,
  amount: number,
  successful = true,
) {
  const params = {
    vnp_Amount: String(amount * 100),
    vnp_Command: 'pay',
    vnp_ResponseCode: successful ? '00' : '24',
    vnp_TmnCode: process.env.VNPAY_TMN_CODE ?? 'TESTCODE',
    vnp_TxnRef: String(paymentId),
    vnp_TransactionStatus: successful ? '00' : '02',
  };

  return {
    ...params,
    vnp_SecureHash: createVnpaySignature(
      params,
      process.env.VNPAY_HASH_SECRET ?? 'test-secret',
    ),
  };
}