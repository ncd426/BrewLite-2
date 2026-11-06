'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  fetchOrderById,
  getAccessToken,
  LOYALTY_REDEMPTION_VND,
  processPayment,
  type OrderHistoryItem,
  type CheckoutPaymentMethod,
} from '@/lib/api';
import { useCartStore } from '@/lib/useCartStore';

function parseOrderId(raw: string | null): number | null {
  if (!raw || !/^[1-9]\d{0,9}$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parsePoints(raw: string | null): number | null {
  if (!raw || !/^\d{1,9}$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function ConfirmContent() {
  const query = useSearchParams();
  const router = useRouter();

  const removeItems = useCartStore((state) => state.removeItems);
  const orderId = parseOrderId(query.get('orderId'));
  const points = parsePoints(query.get('points'));
  const method: CheckoutPaymentMethod | null = query.get('method') === 'VNPAY'
    ? 'VNPAY'
    : null;
  const [order, setOrder] = useState<OrderHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (orderId === null || points === null || method === null) {
      setError('Liên kết xác nhận thanh toán không hợp lệ.');
      setLoading(false);
      return;
    }
    if (!getAccessToken()) {
      setNeedsLogin(true);
      setLoading(false);
      return;
    }
    let mounted = true;
    void fetchOrderById(orderId)
      .then((result) => {
        if (mounted) setOrder(result);
      })
      .catch((cause) => {
        if (mounted) {
          setError(cause instanceof Error ? cause.message : 'Không thể tải thông tin đơn hàng.');
          if (!getAccessToken()) setNeedsLogin(true);
        }
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [orderId, points, method]);

  const paid = order && ['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(order.status);
  const discount = (points ?? 0) * LOYALTY_REDEMPTION_VND;
  const amount = order ? Math.max(0, order.total - discount) : 0;
  const invalidPoints = order !== null && (points === null || discount > order.total);
  const loginNext = `/checkout/confirm?${query.toString()}`;
  const removePurchasedItems = () => {
    const cartKeys = query.get('cartKeys');
    if (cartKeys === null) {
      // Do not clear unrelated cart items for resumed orders.
      return;
    }
    removeItems(cartKeys.split('|').filter(Boolean));
  };

  const handleConfirm = async () => {
    if (submittingRef.current || !order || paid || !method || orderId === null || points === null || invalidPoints) return;
    submittingRef.current = true;
    setPaying(true);
    setError(null);
    try {
      // A persisted key ensures browser retries do not create a second payment.
      const storageKey = `brewlite-demo-idempotency:${orderId}:${method}:${points}`;
      let key = window.sessionStorage.getItem(storageKey);
      if (!key || order.status === 'PAYMENT_FAILED') {
        key = crypto.randomUUID();
        window.sessionStorage.setItem(storageKey, key);
      }
      const result = await processPayment({ orderId, method, pointsToRedeem: points }, key);
      if (result.status === 'PAID') {
        removePurchasedItems();
        router.replace(`/checkout/success?orderId=${orderId}` as any);
      } else if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
      } else {
        setError('Không thể tạo phiên thanh toán từ nhà cung cấp.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể xác nhận giao dịch.');
      try {
        const latest = await fetchOrderById(orderId);
        setOrder(latest);
        if (['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(latest.status)) {
          removePurchasedItems();
          router.replace(`/checkout/success?orderId=${orderId}` as any);
        }
      } catch {
        // Keep the original payment error when status cannot be refreshed.
      }
    } finally {
      submittingRef.current = false;
      setPaying(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">BrewLite • Chế độ thử nghiệm</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Xác nhận thanh toán</h1>
        <p className="mt-2 text-sm text-gray-500">
          VNPay Sandbox
        </p>
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Trạng thái đơn chỉ được cập nhật sau callback đã xác thực từ nhà cung cấp thanh toán.
          Không nhập thông tin thẻ trên BrewLite.
        </div>

        {needsLogin && (
          <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm">
            <p className="mb-3">Đăng nhập <strong>cùng tài khoản đã đặt đơn</strong> để xem và xác nhận.</p>
            <Link
              href={`/login?next=${encodeURIComponent(loginNext)}` as any}
              className="inline-block rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white"
            >
              Đăng nhập để tiếp tục
            </Link>
          </div>
        )}
        {loading && <p className="mt-5 text-sm text-gray-500">Đang tải thông tin đơn hàng...</p>}
        {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {order && (
          <section className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <span className="font-semibold text-amber-950">Đơn hàng #{order.id}</span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{order.status}</span>
            </div>
            <h2 className="font-semibold text-gray-900">Sản phẩm</h2>
            <div className="divide-y divide-gray-100">
              {order.items.map((item, i) => (
                <div key={item.id ?? i} className="flex justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{item.productName || `Sản phẩm #${item.productId}`}</p>
                    <p className="text-xs text-gray-500">Size {item.size} × {item.qty}</p>
                  </div>
                  <span className="shrink-0 font-medium text-gray-900">
                    {(item.lineTotal ?? ((item.unitPrice ?? item.price ?? 0) * item.qty)).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-gray-100 pt-4 text-sm">
              <div className="flex justify-between"><span>Giá trị đơn sau mã giảm giá</span><span>{order.total.toLocaleString('vi-VN')}đ</span></div>
              {(order.discountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-700"><span>Đã giảm bằng mã</span><span>−{order.discountAmount?.toLocaleString('vi-VN')}đ</span></div>
              )}
              <div className="flex justify-between text-emerald-700"><span>Áp dụng {points} điểm</span><span>−{discount.toLocaleString('vi-VN')}đ</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-bold"><span>Tổng xác nhận</span><span className="text-amber-700">{amount.toLocaleString('vi-VN')}đ</span></div>
            </div>

            {paid ? (
              <Link href={`/checkout/success?orderId=${orderId}` as any} className="block rounded-xl bg-emerald-600 px-5 py-3 text-center font-semibold text-white">
                Đơn đã thanh toán • Xem kết quả
              </Link>
            ) : order.status === 'PENDING' || order.status === 'PAYMENT_FAILED' ? (
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={paying || invalidPoints || !method}
                className="w-full rounded-xl bg-amber-600 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {paying ? 'Đang kết nối...' : 'Mở cổng thanh toán'}
              </button>
            ) : (
              <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Đơn không ở trạng thái có thể thanh toán.</p>
            )}
            {invalidPoints && <p className="text-sm text-red-700">Số điểm trong liên kết vượt tổng đơn. Không thể tiếp tục.</p>}
          </section>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-gray-500">
        'Chỉ phản hồi IPN có chữ ký hợp lệ mới xác nhận thanh toán; chuyển hướng trình duyệt không đủ.'
      </p>
    </main>
  );
}

export default function ConfirmPaymentPage() {
  return <Suspense fallback={<p className="p-10 text-center">Đang tải...</p>}><ConfirmContent /></Suspense>;
}
