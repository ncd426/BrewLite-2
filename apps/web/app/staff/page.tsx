'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGate } from '@/components/RoleGate';
import { advanceStaffOrder, fetchStaffOrders, type StaffOrder } from '@/lib/api';

const label: Record<string, string> = {
  PAID: 'Chờ pha chế', PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng giao', COMPLETED: 'Đã giao',
};
const next: Record<string, { status: string; text: string }> = {
  PAID: { status: 'PREPARING', text: 'Bắt đầu pha chế' },
  PREPARING: { status: 'READY', text: 'Đánh dấu đã pha xong' },
  READY: { status: 'COMPLETED', text: 'Xác nhận đã giao khách' },
};

function StaffContent() {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('ACTIVE');

  const refresh = useCallback(async () => {
    try {
      const result = await fetchStaffOrders();
      setOrders(result);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tải danh sách đơn.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const advance = async (order: StaffOrder) => {
    const nextStep = next[order.status];
    if (!nextStep || busy !== null) return;
    setBusy(order.id);
    setError(null);
    try {
      await advanceStaffOrder(order.id, nextStep.status);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể cập nhật trạng thái.');
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const visible = orders.filter((order) =>
    filter === 'ALL' || (filter === 'ACTIVE' ? order.status !== 'COMPLETED' : order.status === filter),
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">BrewLite • Nhân viên</p>
          <h1 className="mt-2 text-3xl font-bold text-amber-950">Quản lý đơn hàng</h1>
          <p className="mt-2 text-sm text-slate-600">Tiếp nhận và theo dõi pha chế các đơn đã thanh toán.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/staff/sales" className="rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-900">Tạo đơn tại quầy</Link>
          <button onClick={() => void refresh()} className="rounded-xl bg-amber-800 px-4 py-2 text-sm font-semibold text-white">Làm mới</button>
        </div>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['PAID','PREPARING','READY','COMPLETED'] as const).map((status) => (
          <div key={status} className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{label[status]}</p>
            <p className="mt-1 text-3xl font-bold text-amber-900">{orders.filter((o) => o.status === status).length}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        {[
          { code: 'ACTIVE', title: 'Đang xử lý' },
          { code: 'PAID', title: 'Chờ pha chế' },
          { code: 'PREPARING', title: 'Đang pha' },
          { code: 'READY', title: 'Sẵn sàng' },
          { code: 'COMPLETED', title: 'Đã giao' },
          { code: 'ALL', title: 'Tất cả' },
        ].map((tab) => (
          <button key={tab.code} type="button" onClick={() => setFilter(tab.code)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${filter === tab.code ? 'bg-amber-800 text-white' : 'border border-amber-200 bg-white text-amber-900'}`}>
            {tab.title}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading && <p className="mt-8 text-sm text-slate-500">Đang tải danh sách đơn...</p>}
      {!loading && visible.length === 0 && <div className="mt-6 rounded-2xl border bg-white p-12 text-center text-slate-500">Không có đơn trong nhóm này.</div>}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {visible.map((order) => (
          <article key={order.id} className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b pb-3">
              <div>
                <p className="text-xl font-bold text-amber-950">Đơn #{order.id}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                <p className="mt-1 text-sm text-slate-700">{order.channel === 'COUNTER' ? 'Nhân viên bán: ' : 'Khách: '}{order.user?.name || 'Khách hàng'}</p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{label[order.status] || order.status}</span>
            </div>
            <div className="my-4 space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-3 text-sm text-slate-700">
                  <span className="rounded-md bg-amber-50 px-2 py-1 font-semibold text-amber-950">×{item.qty}</span>
                  <div>
                    <p className="font-semibold">{item.product.name} · Size {item.size}</p>
                    {Array.isArray(item.toppings) && item.toppings.length > 0 && (
                      <p className="mt-0.5 text-xs text-slate-500">Topping: {item.toppings.join(', ')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="font-bold text-amber-900">{order.total.toLocaleString('vi-VN')}đ</p>
              {next[order.status] ? (
                <button disabled={busy !== null} onClick={() => void advance(order)}
                  className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50">
                  {busy === order.id ? 'Đang cập nhật...' : next[order.status].text}
                </button>
              ) : (
                <span className="text-sm font-semibold text-emerald-700">Đã hoàn tất</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

export default function StaffPage() {
  return <RoleGate area="/staff" allowed={['STAFF', 'ADMIN']}><StaffContent /></RoleGate>;
}
