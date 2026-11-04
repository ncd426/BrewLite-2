'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGate } from '@/components/RoleGate';
import { fetchAdminOverview, type AdminOverview } from '@/lib/api';
import { ProductsManager } from '@/components/admin/ProductsManager';
import { InventoryManager } from '@/components/admin/InventoryManager';
import { UsersManager } from '@/components/admin/UsersManager';

type Tab = 'overview' | 'products' | 'inventory' | 'users';
const tabs: Array<{ id: Tab; title: string }> = [
  { id: 'overview', title: 'Tổng quan' },
  { id: 'products', title: 'Sản phẩm & công thức' },
  { id: 'inventory', title: 'Kho nguyên liệu' },
  { id: 'users', title: 'Tài khoản & phân quyền' },
];

function AdminContent() {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== 'overview') return;
    let active = true;
    void fetchAdminOverview().then((data) => {
      if (active) { setOverview(data); setError(null); }
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Không tải được báo cáo.');
    });
    return () => { active = false; };
  }, [tab]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">BrewLite • Quản trị hệ thống</p>
          <h1 className="mt-2 text-3xl font-bold text-amber-950">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">Quản lý vận hành cửa hàng và phân quyền nhân viên.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/staff" className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900">Quầy pha chế</Link>
          <Link href="/staff/sales" className="rounded-xl bg-amber-800 px-4 py-2 text-sm font-semibold text-white">Bán hàng tại quầy</Link>
        </div>
      </div>

      <nav aria-label="Admin sections" className="mt-7 flex flex-wrap gap-2 border-b border-amber-200 pb-4">
        {tabs.map((item) => (
          <button type="button" key={item.id} onClick={() => setTab(item.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === item.id ? 'bg-amber-800 text-white' : 'border border-amber-200 bg-white text-amber-900'}`}>
            {item.title}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <section className="mt-6">
          {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
          {!overview && !error && <p className="text-slate-500">Đang tải số liệu...</p>}
          {overview && <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {[
                ['Tài khoản', overview.users.toLocaleString('vi-VN')],
                ['Sản phẩm', overview.products.toLocaleString('vi-VN')],
                ['Tổng đơn', overview.orders.toLocaleString('vi-VN')],
                ['Đơn hoàn tất', overview.completedOrders.toLocaleString('vi-VN')],
                ['Nguyên liệu cần nhập', overview.lowStock.toLocaleString('vi-VN')],
                ['Doanh thu mô phỏng', `${overview.simulatedRevenue.toLocaleString('vi-VN')}đ`],
              ].map(([title, value]) => (
                <div key={title} className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">{title}</p>
                  <p className="mt-2 text-2xl font-bold text-amber-950">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs text-slate-500">Số tiền chỉ là giao dịch thanh toán mô phỏng, không phải doanh thu nhận qua ngân hàng.</p>
          </>}
        </section>
      )}
      {tab === 'products' && <ProductsManager />}
      {tab === 'inventory' && <InventoryManager />}
      {tab === 'users' && <UsersManager />}
    </main>
  );
}

export default function AdminPage() {
  return <RoleGate area="/admin" allowed={['ADMIN']}><AdminContent /></RoleGate>;
}
