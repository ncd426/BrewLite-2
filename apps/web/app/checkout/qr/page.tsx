'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  fetchOrderById,
  getAccessToken,
  LOYALTY_REDEMPTION_VND,
  processPayment,
  type CheckoutPaymentMethod,
  type OrderHistoryItem,
  type PaymentResponse,
} from '@/lib/api';
import { useCartStore } from '@/lib/useCartStore';

function toPositiveInt(value: string | null): number | null {
  if (!value || !/^[1-9]\d{0,9}$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function toPoints(value: string | null): number | null {
  if (value === null || !/^\d{1,9}$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function QrPaymentContent() {
  const router = useRouter();
  const query = useSearchParams();
  const orderId = toPositiveInt(query.get('orderId'));
  const points = toPoints(query.get('points'));
  const cartKeys = query.get('cartKeys');
  const method: CheckoutPaymentMethod | null = query.get('method') === 'VNPAY'
    ? 'VNPAY'
    : null;
  // VNPay browser redirects are NOT payment confirmations. Wait for verified IPN.
  const returningFromVnpay = query.has('vnp_ResponseCode') || query.has('vnp_TransactionStatus');

  const removeItems = useCartStore((state) => state.removeItems);
  const [order, setOrder] = useState<OrderHistoryItem | null>(null);
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const paymentStartedFor = useRef<string | null>(null);

  useEffect(() => {
    if (orderId === null || points === null || method === null) {
      setError('Đường dẫn đơn hàng không hợp lệ.');
      setChecking(false);
      return;
    }
    if (!getAccessToken()) {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}` as any);
      return;
    }

    let mounted = true;
    let busy = false;
    const check = async () => {
      if (busy) return;
      busy = true;
      try {
        const current = await fetchOrderById(orderId);
        if (!mounted) return;
        setOrder(current);
        if (['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(current.status)) {
          removePurchasedItems();
          router.replace(`/checkout/success?orderId=${orderId}` as any);
          return;
        }

        if (current.status === 'PAYMENT_FAILED') {
          // A failed IPN must not silently start another payment.
          setPayment(null);
          return;
        }
        // After returning from VNPay, wait for IPN; do not create a second session.
        if (current.status !== 'PENDING' || returningFromVnpay) return;

        const intentKey = `${orderId}:${method}:${points}`;
        if (paymentStartedFor.current !== intentKey) {
          paymentStartedFor.current = intentKey;
          const storageKey = `brewlite-payment:${intentKey}`;
          let idempotencyKey = window.sessionStorage.getItem(storageKey);
          if (!idempotencyKey) {
            idempotencyKey = crypto.randomUUID();
            window.sessionStorage.setItem(storageKey, idempotencyKey);
          }
          const created = await processPayment(
            { orderId, method, pointsToRedeem: points },
            idempotencyKey,
          );
          if (mounted) {
            setPayment(created);
            setError(null);
          }
        }
      } catch (cause) {
        if (mounted) {
          setError(cause instanceof Error ? cause.message : 'Không thể tải trạng thái đơn hàng.');
        }
      } finally {
        busy = false;
        if (mounted) setChecking(false);
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 3000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [orderId, points, method, returningFromVnpay, router]);

  const qrImage = payment?.checkoutUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&ecc=M&data=${encodeURIComponent(payment.checkoutUrl)}`
    : null;
  const pointsDiscount = (points ?? 0) * LOYALTY_REDEMPTION_VND;
  const removePurchasedItems = () => {
    const storageKey = `brewlite-payment-cart:${orderId}`;
    const cartKeys = query.get('cartKeys') ?? window.sessionStorage.getItem(storageKey);
    if (cartKeys === null) {
      // Do not clear unrelated cart items for resumed orders.
      return;
    }
    removeItems(cartKeys.split('|').filter(Boolean));
    window.sessionStorage.removeItem(storageKey);
  };

  const retryPayment = async () => {
    if (retrying || order?.status !== 'PAYMENT_FAILED' || orderId === null || points === null || method === null) return;
    setRetrying(true);
    setError(null);
    const intentKey = `${orderId}:${method}:${points}`;
    const storageKey = `brewlite-payment:${intentKey}`;
    // Only an explicit click starts a NEW attempt with a NEW idempotency key.
    const idempotencyKey = crypto.randomUUID();
    window.sessionStorage.setItem(storageKey, idempotencyKey);
    paymentStartedFor.current = intentKey;
    try {
      const created = await processPayment({ orderId, method, pointsToRedeem: points }, idempotencyKey);
      setPayment(created);
      setOrder(await fetchOrderById(orderId));
    } catch (cause) {
      paymentStartedFor.current = null;
      setError(cause instanceof Error ? cause.message : 'Không thể tạo phiên thanh toán mới.');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/orders" className="text-sm text-amber-700 hover:underline">← Lịch sử đơn hàng</Link>
      <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">BrewLite • Sandbox</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Thanh toán VNPay QR</h1>
          </div>
          {orderId && <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">Đơn #{orderId}</span>}
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Quét mã để mở cổng thanh toán sandbox. BrewLite chỉ cập nhật đơn sau khi nhận và xác thực
          phản hồi IPN từ nhà cung cấp; quay lại trang này không tự xác nhận thanh toán.
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {checking && <p className="mt-4 text-sm text-gray-500">Đang tải đơn hàng...</p>}

        {order && (
          <section className="mt-5 rounded-xl bg-amber-50 p-4">
            <h2 className="font-semibold text-gray-900">Thông tin thanh toán</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span>Giá trị đơn sau khuyến mãi</span><span>{order.total.toLocaleString('vi-VN')}đ</span></div>
              <div className="flex justify-between text-emerald-700"><span>Giảm từ {points} điểm</span><span>−{pointsDiscount.toLocaleString('vi-VN')}đ</span></div>
              <div className="flex justify-between border-t border-amber-200 pt-2 text-base font-bold"><span>Cần thanh toán</span><span>{Math.max(0, order.total - pointsDiscount).toLocaleString('vi-VN')}đ</span></div>
              <div className="text-gray-500">Trạng thái: <strong>{order.status}</strong></div>
            </div>
          </section>
        )}

        {payment?.expiresAt && order?.status === 'PENDING' && (
          <p className="mt-4 text-center text-sm text-gray-600">
            QR hết hạn lúc {new Date(payment.expiresAt).toLocaleTimeString('vi-VN')}.
          </p>
        )}

        {order?.status === 'PENDING' && pointsDiscount <= order.total && (
          <div className="mt-6 flex flex-col items-center gap-4">
            {qrImage && (
              <img
                src={qrImage}
                width={280}
                height={280}
                alt="Mã QR thanh toán VNPay"
                referrerPolicy="no-referrer"
                className="rounded-xl border border-gray-200 bg-white p-3"
              />
            )}
            {payment?.checkoutUrl ? (
              <a href={payment.checkoutUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-amber-700 underline">
                Mở cổng thanh toán trên thiết bị này
              </a>
            ) : (
              <p className="text-center text-sm text-gray-500">
                {returningFromVnpay
                  ? 'Đang chờ VNPay xác nhận giao dịch qua IPN. Trang này không tự tạo lần thanh toán khác.'
                  : 'Đang tạo phiên thanh toán an toàn...'}
              </p>
            )}
            <p className="text-xs text-gray-500">Trang này kiểm tra trạng thái đơn mỗi 3 giây.</p>
          </div>
        )}

        {order?.status === 'CANCELLED' && <p className="mt-5 rounded-lg bg-red-50 p-3 text-center text-sm text-red-700">Mã QR đã hết hạn và đơn hàng đã bị hủy. Vui lòng đặt lại đơn hàng.</p>}
        {order?.status === 'PAYMENT_FAILED' && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Thanh toán đã bị hủy hoặc thất bại.</p>
            <p className="mt-1">Đơn hàng chưa được thanh toán. Bạn có thể chủ động thử lại.</p>
            <button
              type="button"
              onClick={() => void retryPayment()}
              disabled={retrying}
              className="mt-4 w-full rounded-lg bg-amber-700 px-4 py-3 font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retrying ? 'Đang tạo phiên mới...' : 'Thử thanh toán lại'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function QrPaymentPage() {
  return <Suspense fallback={<p className="p-10 text-center">Đang chuẩn bị QR...</p>}><QrPaymentContent /></Suspense>;
}
