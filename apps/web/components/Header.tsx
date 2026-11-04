'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  clearAccessToken, getAccessToken, getUserEmail, getUserName,
  fetchMyProfile, type UserRole,
} from '@/lib/api';
import { useCartStore } from '@/lib/useCartStore';

type AuthState = {
  email: string | null;
  name: string | null;
  role: UserRole | null;
  loading: boolean;
};

export function Header() {
  const [auth, setAuth] = useState<AuthState>({ email: null, name: null, role: null, loading: true });
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const totalItems = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

  useEffect(() => {
    let version = 0;
    const sync = () => {
      const current = ++version;
      const token = getAccessToken();
      if (!token) {
        setAuth({ email: null, name: null, role: null, loading: false });
        setOpen(false);
        return;
      }
      setAuth({ email: getUserEmail(), name: getUserName(), role: null, loading: true });
      void fetchMyProfile().then((profile) => {
        if (current !== version) return;
        setAuth({ email: profile.email, name: profile.name, role: profile.role, loading: false });
      }).catch(() => {
        if (current !== version) return;
        setAuth({ email: null, name: null, role: null, loading: false });
        setOpen(false);
      });
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith('brewlite-')) sync();
    };
    sync();
    window.addEventListener('brewlite-auth-change', sync);
    window.addEventListener('storage', onStorage);
    return () => {
      ++version;
      window.removeEventListener('brewlite-auth-change', sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const esc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const working = auth.role === 'STAFF' || auth.role === 'ADMIN';
  const home = auth.role === 'ADMIN' ? '/admin' : auth.role === 'STAFF' ? '/staff' : '/';
  const logout = () => {
    // An actual document navigation clears sensitive page state and cached screens.
    clearAccessToken();
    useCartStore.getState().clearCart();
    setOpen(false);
    window.location.replace('/login');
  };

  return (
    <header className="border-b border-amber-200 bg-white/95 shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href={home} className="flex items-center gap-3 font-bold text-amber-950">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-800 text-xl text-white">B</span>
          <span>BrewLite <span className="font-normal text-amber-700">{auth.role === 'ADMIN' ? 'Admin' : auth.role === 'STAFF' ? 'Staff' : 'Menu'}</span></span>
        </Link>
        <nav className="ml-auto flex flex-wrap items-center gap-2">
          {!auth.loading && working && (
            <>
              <Link href="/staff/sales" className="rounded-xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-50">Bán tại quầy</Link>
              <Link href="/staff" className="rounded-xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-50">Đơn cần pha</Link>
              {auth.role === 'ADMIN' && (
                <Link href="/admin" className="rounded-xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-50">Quản trị</Link>
              )}
            </>
          )}
          {!auth.loading && !working && (
            <>
              {auth.email && <Link href="/orders" className="rounded-xl border border-amber-200 px-3 py-2 text-sm text-amber-900 hover:bg-amber-50">Lịch sử đơn</Link>}
              <Link href="/cart" className="rounded-xl border border-amber-200 px-3 py-2 text-sm text-amber-900 hover:bg-amber-50">Giỏ hàng{totalItems > 0 ? ` (${totalItems})` : ''}</Link>
            </>
          )}
          {!auth.loading && auth.email ? (
            <div ref={menuRef} className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
                className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-200">
                {auth.name || auth.email} <span aria-hidden="true">{open ? '▲' : '▼'}</span>
              </button>
              {open && (
                <div role="menu" className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-lg">
                  {!working && <Link href="/profile" role="menuitem" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm text-amber-950 hover:bg-amber-50">Thông tin cá nhân</Link>}
                  {working && <Link href="/staff/sales" role="menuitem" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm text-amber-950 hover:bg-amber-50">Bán hàng tại quầy</Link>}
                  {auth.role === 'ADMIN' && <Link href="/admin" role="menuitem" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm text-amber-950 hover:bg-amber-50">Quản lý cửa hàng</Link>}
                  <button type="button" role="menuitem" onClick={logout} className="block w-full px-4 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50">Đăng xuất</button>
                </div>
              )}
            </div>
          ) : !auth.loading ? (
            <Link href="/login" className="rounded-xl bg-amber-800 px-4 py-2 text-sm font-semibold text-white">Đăng nhập</Link>
          ) : <span className="text-xs text-slate-500">Đang tải...</span>}
        </nav>
      </div>
    </header>
  );
}
