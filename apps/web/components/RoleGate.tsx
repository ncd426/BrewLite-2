'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  fetchMyProfile, getAccessToken, type UserRole,
} from '@/lib/api';

type Props = {
  allowed: UserRole[];
  area: string;
  children: React.ReactNode;
};

export function RoleGate({ allowed, area, children }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied' | 'error'>('loading');
  useEffect(() => {
    let active = true;
    if (!getAccessToken()) {
      router.replace(`/login?next=${encodeURIComponent(area)}` as any);
      return;
    }
    void fetchMyProfile().then((user) => {
      if (active) setStatus(allowed.includes(user.role) ? 'allowed' : 'denied');
    }).catch(() => {
      if (active) setStatus('error');
    });
    return () => { active = false; };
  }, [area, router]);

  if (status === 'allowed') return <>{children}</>;
  if (status === 'loading') {
    return <main className="mx-auto max-w-5xl px-4 py-14 text-center text-slate-500">Đang kiểm tra quyền truy cập...</main>;
  }
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-amber-950">Không thể truy cập khu vực này</h1>
      <p className="mt-3 text-sm text-slate-600">
        {status === 'denied'
          ? 'Tài khoản của bạn không có quyền sử dụng chức năng này.'
          : 'Không kiểm tra được quyền truy cập. Vui lòng đăng nhập lại.'}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="rounded-xl border px-4 py-2 text-amber-800">Về trang chủ</Link>
        <Link href="/login" className="rounded-xl bg-amber-700 px-4 py-2 text-white">Đăng nhập</Link>
      </div>
    </main>
  );
}
