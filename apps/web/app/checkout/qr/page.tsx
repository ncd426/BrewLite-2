'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchOrderById, getAccessToken, LOYALTY_REDEMPTION_VND, type OrderHistoryItem } from '@/lib/api';
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

  const removeItems = useCartStore((state) => state.removeItems);
  const [order, setOrder] = useState<OrderHistoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setOrigin(process.env.NEXT_PUBLIC_WEB_ORIGIN || window.location.origin);
  }, []);

  useEffect(() => {
    if (orderId === null || points === null) {
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
        setError(null);
        if (['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(current.status)) {
          removePurchasedItems();
          router.replace(`/checkout/success?orderId=${orderId}` as any);
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
  }, [orderId, points, router]);

  const confirmationUrl = useMemo(() => {
    if (orderId === null || points === null || !origin.trim()) return null;
    try {
      const base = new URL(origin.trim());
      if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) return null;
      const url = new URL('/checkout/confirm', base.origin);
      url.searchParams.set('orderId', String(orderId));
      url.searchParams.set('method', 'MOMO');
      url.searchParams.set('points', String(points));
      if (cartKeys !== null) url.searchParams.set('cartKeys', cartKeys);
      return url.toString();
    } catch {
      return null;
    }
  }, [orderId, points, origin, cartKeys]);

  const qrImage = confirmationUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&ecc=M&data=${encodeURIComponent(confirmationUrl)}`
    : null;
  const pointsDiscount = (points ?? 0) * LOYALTY_REDEMPTION_VND;
  const removePurchasedItems = () => {
    const cartKeys = query.get('cartKeys');
    if (cartKeys === null) {
      // Do not clear unrelated cart items for resumed orders.
      return;
    }
    removeItems(cartKeys.split('|').filter(Boolean));
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/orders" className="text-sm text-amber-700 hover:underline">← Lịch sử đơn hàng</Link>
      <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">BrewLite • Thanh toán thử nghiệm</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Quét QR để xác nhận đơn</h1>
          </div>
          {orderId && <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">Đơn #{orderId}</span>}
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Đây là <strong>QR mở trang xác nhận đơn của BrewLite</strong>, KHÔNG phải QR chuyển tiền ngân hàng.
          Chỉ khi người mua đăng nhập cùng tài khoản và bấm xác nhận, hệ thống demo mới ghi nhận thanh toán.
          Không có giao dịch tiền thật.
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {checking && <p className="mt-4 text-sm text-gray-500">Đang tải đơn hàng...</p>}

        {order && (
          <section className="mt-5 rounded-xl bg-amber-50 p-4">
            <h2 className="font-semibold text-gray-900">Thông tin thanh toán</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span>Giá trị đơn sau khuyến mãi</span><span>{order.total.toLocaleString('vi-VN')}đ</span></div>
              <div className="flex justify-between text-emerald-700"><span>Giảm từ {points} điểm</span><span>−{pointsDiscount.toLocaleString('vi-VN')}đ</span></div>
              <div className="flex justify-between border-t border-amber-200 pt-2 text-base font-bold"><span>Cần xác nhận</span><span>{Math.max(0, order.total - pointsDiscount).toLocaleString('vi-VN')}đ</span></div>
              <div className="text-gray-500">Trạng thái: <strong>{order.status}</strong></div>
            </div>
          </section>
        )}

        {order && ['PENDING', 'PAYMENT_FAILED'].includes(order.status) && pointsDiscount <= order.total && (
          <div className="mt-6 flex flex-col items-center gap-4">
            {qrImage && (
              <img
                src={qrImage}
                width={280}
                height={280}
                alt="Mã QR dẫn đến trang xác nhận đơn BrewLite"
                referrerPolicy="no-referrer"
                className="rounded-xl border border-gray-200 bg-white p-3"
              />
            )}
            <p className="text-center text-sm text-gray-600">
              Dùng camera điện thoại quét mã, đăng nhập <strong>cùng tài khoản</strong> đã đặt đơn,
              xem chi tiết rồi bấm xác nhận trên điện thoại.
            </p>
            {confirmationUrl && (
              <a href={confirmationUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-amber-700 underline">
                Hoặc mở trang xác nhận để thử trên cùng máy
              </a>
            )}
            <p className="text-xs text-gray-500">Trang này tự kiểm tra trạng thái mỗi 3 giây và chuyển đến màn hình thành công sau khi xác nhận.</p>
          </div>
        )}

        <div className="mt-6 border-t border-gray-100 pt-4">
          <label htmlFor="qr-origin" className="block text-sm font-semibold text-gray-800">Địa chỉ mở từ điện thoại</label>
          <input
            id="qr-origin"
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
            placeholder="http://192.168.1.10:3000"
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
          <p className="mt-2 text-xs text-gray-500">
            Nếu đang là localhost, đổi thành địa chỉ IPv4 của máy chạy BrewLite, ví dụ
            http://192.168.1.10:3000. Điện thoại và máy tính phải cùng Wi-Fi.
          </p>
          {!confirmationUrl && <p className="mt-2 text-xs text-red-600">Địa chỉ không hợp lệ; dùng http:// hoặc https://.</p>}
        </div>
      </div>
    </main>
  );
}

export default function QrPaymentPage() {
  return <Suspense fallback={<p className="p-10 text-center">Đang chuẩn bị QR...</p>}><QrPaymentContent /></Suspense>;
}
