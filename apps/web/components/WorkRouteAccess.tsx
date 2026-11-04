'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearAccessToken, fetchMyProfile, getAccessToken } from '@/lib/api';

const customerSections = ['/products', '/cart', '/checkout', '/orders', '/profile'];
function isCustomerRoute(path: string) {
  return path === '/' || customerSections.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

// Client-side route gate provides UX only. NestJS RolesGuard protects mutations.
export function WorkRouteAccess({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [access, setAccess] = useState<{ path: string; allowed: boolean; failed?: boolean }>({ path: '', allowed: false });

  useEffect(() => {
    let active = true;
    const token = getAccessToken();
    if (!token) {
      setAccess({ path: pathname, allowed: true });
      return;
    }
    setAccess({ path: pathname, allowed: false });
    void fetchMyProfile().then((profile) => {
      if (!active) return;
      const role = profile.role;
      const isWorker = role === 'STAFF' || role === 'ADMIN';
      const workerHome = role === 'ADMIN' ? '/admin' : '/staff';
      let target: '/' | '/admin' | '/staff' | null = null;
      if (isWorker && (isCustomerRoute(pathname) || pathname === '/login')) {
        target = workerHome;
      } else if (role === 'STAFF' && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
        target = '/staff';
      } else if (role === 'CUSTOMER' && (
        pathname === '/staff' || pathname.startsWith('/staff/') ||
        pathname === '/admin' || pathname.startsWith('/admin/')
      )) {
        target = '/';
      }
      if (target && target !== pathname) {
        router.replace(target);
      } else {
        setAccess({ path: pathname, allowed: true });
      }
    }).catch(() => {
      if (!active) return;
      if (!getAccessToken()) router.replace('/login');
      else setAccess({ path: pathname, allowed: false, failed: true });
    });
    return () => { active = false; };
  }, [pathname, router]);

  if (access.path === pathname && access.failed) {
    return <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <p role="alert" className="text-sm text-red-700">Không kiểm tra được quyền truy cập. Kiểm tra Backend rồi tải lại trang.</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl border px-4 py-2">Thử lại</button>
      <button type="button" onClick={() => { clearAccessToken(); window.location.replace('/login'); }} className="ml-2 mt-4 rounded-xl bg-amber-800 px-4 py-2 text-white">Đăng xuất</button>
    </main>;
  }
  if (access.path !== pathname || !access.allowed) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-center text-slate-500">Đang kiểm tra quyền truy cập...</main>;
  }
  return <>{children}</>;
}
