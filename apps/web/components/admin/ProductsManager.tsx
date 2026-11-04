'use client';

import { useEffect, useState } from 'react';
import {
  createAdminProduct, deleteAdminProduct,
  fetchAdminInventory, fetchAdminProducts, updateAdminProduct,
  type AdminProduct, type Ingredient, type ProductForm, type RecipeLine,
} from '@/lib/api';

const emptyForm: ProductForm = {
  name: '', price: 35000, category: 'Cà phê', description: '', imageUrl: '', recipe: [],
};

export function ProductsManager() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [optional, setOptional] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async () => {
    const [data, inv] = await Promise.all([fetchAdminProducts(), fetchAdminInventory()]);
    setProducts(data); setIngredients(inv);
  };
  useEffect(() => { void refresh().catch((cause) => setError(cause.message)); }, []);

  const startEdit = (item: AdminProduct) => {
    setEditingId(item.id);
    setForm({
      name: item.name, price: item.price, category: item.category ?? '',
      description: item.description ?? '', imageUrl: item.imageUrl ?? '',
      recipe: item.productIngredients.map((r) => ({
        ingredientId: r.ingredientId, quantity: r.quantity, isOptional: r.isOptional,
      })),
    });
    setError(null); setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => { setEditingId(null); setForm({ ...emptyForm, recipe: [] }); };

  const addRecipe = () => {
    const id = Number(selectedIngredient);
    if (!id || !Number.isSafeInteger(selectedQty) || selectedQty < 1 || form.recipe.some((r) => r.ingredientId === id)) {
      setError('Chọn nguyên liệu khác, chưa trùng, với số lượng hợp lệ.'); return;
    }
    setForm((v) => ({ ...v, recipe: [...v.recipe, { ingredientId: id, quantity: selectedQty, isOptional: optional }] }));
    setSelectedIngredient(''); setSelectedQty(1); setOptional(false); setError(null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.recipe.length === 0) { setError('Sản phẩm phải có ít nhất một nguyên liệu trong công thức.'); return; }
    setBusy(true); setError(null); setMessage(null);
    try {
      if (editingId !== null) await updateAdminProduct(editingId, form);
      else await createAdminProduct(form);
      setMessage(editingId !== null ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm.');
      reset(); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không lưu được sản phẩm.'); }
    finally { setBusy(false); }
  };

  const remove = async (product: AdminProduct) => {
    if (!window.confirm(`Xóa sản phẩm ${product.name}? Nếu đã có đơn hàng, hệ thống sẽ từ chối.`)) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      await deleteAdminProduct(product.id);
      setMessage('Đã xóa sản phẩm chưa có lịch sử đơn.');
      if (editingId === product.id) reset();
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không xóa được sản phẩm.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="mt-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-amber-950">Sản phẩm và công thức pha chế</h2>
        <p className="mt-1 text-sm text-slate-500">Mọi sản phẩm phải có công thức nguyên liệu để kiểm soát tồn kho khi đặt.</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      <form onSubmit={(e) => void save(e)} className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-amber-950">{editingId !== null ? `Sửa sản phẩm #${editingId}` : 'Thêm sản phẩm mới'}</h3>
          {editingId !== null && <button type="button" className="text-sm text-amber-800 underline" onClick={reset}>Hủy sửa</button>}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-600">Tên sản phẩm
            <input required maxLength={120} value={form.name} onChange={(e) => setForm((v) => ({...v, name:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2 text-slate-900" />
          </label>
          <label className="text-sm text-slate-600">Giá cơ bản (VND)
            <input required type="number" min={0} max={2147483647} value={form.price} onChange={(e) => setForm((v) => ({...v, price:Number(e.target.value)}))} className="mt-1 w-full rounded-lg border px-3 py-2 text-slate-900" />
          </label>
          <label className="text-sm text-slate-600">Danh mục
            <input maxLength={80} value={form.category ?? ''} onChange={(e) => setForm((v) => ({...v, category:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2 text-slate-900" />
          </label>
          <label className="text-sm text-slate-600">URL ảnh
            <input maxLength={2000} value={form.imageUrl ?? ''} onChange={(e) => setForm((v) => ({...v, imageUrl:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2 text-slate-900" />
          </label>
        </div>
        <label className="mt-3 block text-sm text-slate-600">Mô tả
          <textarea maxLength={600} rows={2} value={form.description ?? ''} onChange={(e) => setForm((v) => ({...v, description:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2 text-slate-900" />
        </label>
        <div className="mt-5 border-t pt-4">
          <h4 className="font-semibold text-amber-950">Công thức pha chế</h4>
          {form.recipe.length === 0 && <p className="mt-2 text-sm text-red-700">Chưa có nguyên liệu. Thêm ít nhất một nguyên liệu để có thể lưu.</p>}
          <div className="mt-3 space-y-2">
            {form.recipe.map((item) => {
              const ing = ingredients.find((x) => x.id === item.ingredientId);
              return <div key={item.ingredientId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 p-3 text-sm">
                <span className="text-amber-950">{ing?.name ?? `Nguyên liệu #${item.ingredientId}`} · {item.quantity} {ing?.unit ?? ''} {item.isOptional ? '(Tùy chọn)' : '(Bắt buộc)'}</span>
                <button type="button" onClick={() => setForm((v) => ({...v, recipe: v.recipe.filter((r) => r.ingredientId !== item.ingredientId)}))} className="font-semibold text-red-700">Xóa khỏi công thức</button>
              </div>;
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select aria-label="Chọn nguyên liệu" value={selectedIngredient} onChange={(e) => setSelectedIngredient(e.target.value)} className="min-w-44 rounded-lg border px-3 py-2 text-sm">
              <option value="">Chọn nguyên liệu...</option>
              {ingredients.map((i) => <option value={i.id} key={i.id}>{i.name} ({i.unit})</option>)}
            </select>
            <input aria-label="Định lượng công thức" type="number" min={1} max={1000000} value={selectedQty} onChange={(e) => setSelectedQty(Number(e.target.value))} className="w-28 rounded-lg border px-3 py-2" />
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={optional} onChange={(e) => setOptional(e.target.checked)} />Tùy chọn</label>
            <button type="button" onClick={addRecipe} className="rounded-lg border border-amber-700 px-4 py-2 text-sm font-semibold text-amber-900">Thêm vào công thức</button>
          </div>
        </div>
        <button type="submit" disabled={busy} className="mt-5 rounded-xl bg-amber-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Đang lưu...' : editingId !== null ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {products.map((product) => (
          <article key={product.id} className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs text-amber-700">#{product.id} · {product.category ?? 'Đồ uống'}</p>
                <h3 className="mt-1 text-lg font-bold text-amber-950">{product.name}</h3>
                <p className="mt-1 font-semibold text-amber-800">{product.price.toLocaleString('vi-VN')}đ</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => startEdit(product)} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-900">Sửa</button>
                <button disabled={busy} onClick={() => void remove(product)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Xóa</button>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">{product.productIngredients.length} nguyên liệu trong công thức</p>
          </article>
        ))}
      </div>
    </section>
  );
}
