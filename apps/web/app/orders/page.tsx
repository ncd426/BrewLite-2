'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  fetchMyOrders,
  getAccessToken,
  LOYALTY_REDEMPTION_VND,
  OrderHistoryItem,
} from '@/lib/api';

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.push('/login');
      return;
    }

    fetchMyOrders()
      .then((res: any) => {
        // Backend trả về dạng { userId: 1, orders: [...] } nên cần lấy res.orders
        if (Array.isArray(res?.orders)) {
          setOrders(res.orders);
        } else if (Array.isArray(res)) {
          setOrders(res);
        } else {
          setOrders([]);
        }
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải lịch sử đơn hàng');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
      case 'COMPLETED':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Thành công</span>;
      case 'PENDING':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Đang chờ</span>;
      case 'PAYMENT_FAILED':
      case 'CANCELLED':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Thất bại</span>;
      default:
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center text-gray-600">
        <p className="animate-pulse">Đang tải lịch sử đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <div className="flex items-center justify-between mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Lịch sử đơn hàng</h1>
        <Link
          href="/"
          className="text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          ← Về trang chủ
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">Bạn chưa có đơn hàng nào.</p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition"
          >
            Mua sắm ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const orderCode = order.orderId || order.id;
            return (
              <div
                key={order.id || order.orderId}
                className="bg-white border rounded-xl shadow-sm p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <span className="text-sm text-gray-500">Mã đơn: </span>
                    <span className="font-semibold text-gray-900">#{orderCode}</span>
                    {order.createdAt && (
                      <span className="text-xs text-gray-400 block sm:inline sm:ml-3">
                        {new Date(order.createdAt).toLocaleString('vi-VN')}
                      </span>
                    )}
                  </div>
                  <div>{getStatusBadge(order.status)}</div>
                </div>

                <div className="divide-y divide-gray-100">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="py-2 flex justify-between text-sm">
                      <div>
                        <span className="font-medium text-gray-800">
                          {item.productName || `Sản phẩm #${item.productId}`}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          (Size {item.size} x {item.qty})
                        </span>
                        {item.toppings && item.toppings.length > 0 && (
                          <p className="mt-1 text-xs text-amber-800">
                            Topping: {item.toppings.join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="text-gray-700">
                        {((item as any).lineTotal ?? (((item as any).unitPrice || item.price || 0) * (item.qty || 1))).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  ))}
                </div>

                {(order.discountAmount ?? 0) > 0 && (
                  <div className="text-sm text-emerald-700">
                    Giảm bằng mã khuyến mãi: −{(order.discountAmount ?? 0).toLocaleString('vi-VN')}đ
                  </div>
                )}
                {(order.pointsUsed ?? 0) > 0 && (
                  <div className="text-sm text-emerald-700">
                    Đã dùng {order.pointsUsed} điểm, giảm{' '}
                    {((order.pointsUsed ?? 0) * LOYALTY_REDEMPTION_VND).toLocaleString('vi-VN')}đ
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="font-medium text-gray-700">Tổng thanh toán:</span>
                  <span className="text-lg font-bold text-amber-600">
                    {(order.paidAmount ?? order.total).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                {['PENDING', 'PAYMENT_FAILED'].includes(order.status) && (
                  <div>
                    <Link
                      href={`/checkout/qr?orderId=${orderCode}&method=VNPAY&points=0` as any}
                      className="rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700"
                    >
                      Thanh toán tiếp bằng VNPay QR
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}