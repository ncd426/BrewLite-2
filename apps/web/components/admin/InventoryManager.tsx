'use client';

import { useEffect, useState } from 'react';
import {
  adjustAdminInventory, createAdminIngredient, fetchAdminInventory,
  type Ingredient,
} from '@/lib/api';

export function InventoryManager() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [changes, setChanges] = useState<Record<number, string>>({});
  const [minimums, setMinimums] = useState<Record<number, string>>({});
  const [form, setForm] = useState({ code: '', name: '', unit: 'g', stockQuantity: 0, minStock: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async () => {
    const result = await fetchAdminInventory();
    setIngredients(result);
  };
  useEffect(() => { void refresh().catch((err) => setError(err.message)); }, []);

  const adjust = async (ingredient: Ingredient) => {
    const delta = Number(changes[ingredient.id] ?? '0');
    const minimum = minimums[ingredient.id] === undefined
      ? undefined : Number(minimums[ingredient.id]);
    if (!Number.isSafeInteger(delta) || Math.abs(delta) > 1000000 ||
      (minimum !== undefined && (!Number.isSafeInteger(minimum) || minimum < 0))) {
      setError('Số lượng hoặc tồn kho tối thiểu không hợp lệ.'); return;
    }
    setBusy(true); setError(null); setMessage(null);
    try {
      await adjustAdminInventory(ingredient.id, delta, minimum);
      setChanges((old) => ({ ...old, [ingredient.id]: '' }));
      setMinimums((old) => { const copy = { ...old }; delete copy[ingredient.id]; return copy; });
      setMessage(`Đã cập nhật ${ingredient.name}.`);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể cập nhật kho.'); }
    finally { setBusy(false); }
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null);
    try {
      await createAdminIngredient(form);
      setForm({ code: '', name: '', unit: 'g', stockQuantity: 0, minStock: 0 });
      await refresh(); setMessage('Đã tạo nguyên liệu mới.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể tạo nguyên liệu.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="mt-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-amber-950">Kho nguyên liệu</h2>
        <p className="mt-1 text-sm text-slate-500">Điều chỉnh cộng/trừ kho bằng giao dịch nguyên tử, không ghi đè số lượng còn lại từ đơn khác.</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      <form onSubmit={(event) => void create(event)} className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-bold text-amber-950">Thêm nguyên liệu</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input aria-label="Mã nguyên liệu" required maxLength={60} placeholder="Mã nguyên liệu" value={form.code} onChange={(e) => setForm((v) => ({...v,code:e.target.value}))} className="rounded-lg border px-3 py-2" />
          <input aria-label="Tên nguyên liệu" required maxLength={120} placeholder="Tên nguyên liệu" value={form.name} onChange={(e) => setForm((v) => ({...v,name:e.target.value}))} className="rounded-lg border px-3 py-2" />
          <input aria-label="Đơn vị" required maxLength={30} placeholder="Đơn vị" value={form.unit} onChange={(e) => setForm((v) => ({...v,unit:e.target.value}))} className="rounded-lg border px-3 py-2" />
          <input aria-label="Số lượng ban đầu" type="number" min={0} max={2147483647} value={form.stockQuantity} onChange={(e) => setForm((v) => ({...v,stockQuantity:Number(e.target.value)}))} className="rounded-lg border px-3 py-2" />
          <input aria-label="Kho tối thiểu" type="number" min={0} max={2147483647} value={form.minStock} onChange={(e) => setForm((v) => ({...v,minStock:Number(e.target.value)}))} className="rounded-lg border px-3 py-2" />
        </div>
        <button type="submit" disabled={busy} className="mt-3 rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Thêm nguyên liệu</button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-amber-100 bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-amber-50 text-amber-950"><tr>
            <th className="px-4 py-3">Nguyên liệu</th>
            <th className="px-4 py-3">Tồn kho</th>
            <th className="px-4 py-3">Mức tối thiểu</th>
            <th className="px-4 py-3">Thêm / trừ</th>
            <th className="px-4 py-3">Thao tác</th>
          </tr></thead>
          <tbody>
            {ingredients.map((item) => (
              <tr key={item.id} className="border-t border-amber-50">
                <td className="px-4 py-3"><p className="font-semibold text-amber-950">{item.name}</p><p className="text-xs text-slate-500">{item.code}</p></td>
                <td className={`px-4 py-3 font-bold ${item.stockQuantity <= item.minStock ? 'text-red-700' : 'text-emerald-800'}`}>{item.stockQuantity} {item.unit}</td>
                <td className="px-4 py-3"><input type="number" min={0} aria-label={`Mức tối thiểu ${item.name}`} value={minimums[item.id] ?? item.minStock} onChange={(e) => setMinimums((v) => ({ ...v,[item.id]:e.target.value }))} className="w-24 rounded-lg border px-2 py-2" /></td>
                <td className="px-4 py-3"><input type="number" min={-1000000} max={1000000} aria-label={`Điều chỉnh ${item.name}`} placeholder="+500 hoặc -10" value={changes[item.id] ?? ''} onChange={(e) => setChanges((v) => ({ ...v,[item.id]:e.target.value }))} className="w-36 rounded-lg border px-3 py-2" /></td>
                <td className="px-4 py-3"><button disabled={busy || ((changes[item.id] ?? '') === '' && minimums[item.id] === undefined)} onClick={() => void adjust(item)} className="rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white disabled:opacity-50">Lưu</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
