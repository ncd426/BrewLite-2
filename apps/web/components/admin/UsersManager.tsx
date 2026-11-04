'use client';

import { useEffect, useState } from 'react';
import {
  fetchAdminUsers, fetchMyProfile, updateAdminUserRole,
  type AdminUser, type UserRole,
} from '@/lib/api';

const roleLabel: Record<UserRole, string> = {
  CUSTOMER: 'Khách hàng', STAFF: 'Nhân viên', ADMIN: 'Quản lý',
};

export function UsersManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [ownId, setOwnId] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchAdminUsers(), fetchMyProfile()]).then(([list, me]) => {
      setUsers(list); setOwnId(me.id);
    }).catch((err) => setError(err instanceof Error ? err.message : 'Không tải được tài khoản.'));
  }, []);

  const update = async (user: AdminUser, role: UserRole) => {
    if (user.id === ownId || busy !== null || role === user.role) return;
    if (!window.confirm(`Đổi quyền của ${user.email} thành ${roleLabel[role]}?`)) return;
    setBusy(user.id);
    setError(null); setSuccess(null);
    try {
      const updated = await updateAdminUserRole(user.id, role);
      setUsers((current) => current.map((row) => row.id === updated.id ? { ...row, role: updated.role } : row));
      setSuccess(`Đã cập nhật quyền cho ${user.email}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đổi quyền.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mt-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-amber-950">Quản lý tài khoản</h2>
        <p className="mt-1 text-sm text-slate-500">Chỉ Admin được cấp quyền nhân viên/quản lý. Không thể tự thay đổi quyền của mình.</p>
      </div>
      {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
      <div className="overflow-x-auto rounded-2xl border border-amber-100 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-amber-50 text-amber-950"><tr>
            <th className="px-4 py-3">Tài khoản</th><th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Điểm</th><th className="px-4 py-3">Quyền</th>
          </tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-amber-50">
                <td className="px-4 py-3 font-semibold text-amber-950">{user.name || 'Chưa đặt tên'}{user.id === ownId ? ' (Bạn)' : ''}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.loyaltyPoints}</td>
                <td className="px-4 py-3">
                  <select aria-label={`Phân quyền ${user.email}`} value={user.role}
                    disabled={busy !== null || user.id === ownId}
                    onChange={(e) => void update(user, e.target.value as UserRole)}
                    className="rounded-lg border border-amber-200 bg-white px-3 py-2 disabled:opacity-50">
                    {(Object.keys(roleLabel) as UserRole[]).map((role) => <option key={role} value={role}>{roleLabel[role]}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="p-5 text-sm text-slate-500">Đang tải hoặc chưa có tài khoản.</p>}
      </div>
    </section>
  );
}
