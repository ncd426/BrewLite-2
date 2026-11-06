'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RoleGate } from '@/components/RoleGate';
import {
  createCounterSale,
  fetchProducts,
  type CounterSaleResponse,
  type PaymentMethod,
  type Product,
} from '@/lib/api';

type Size = 'S' | 'M' | 'L';
type Line = {
  key: string;
  productId: number;
  name: string;
  unitPrice: number;
  size: Size;
  toppings: string[];
  qty: number;
};
const sizePrices: Record<Size, number> = { S: 0, M: 5000, L: 10000 };
const toppingPrices: Record<string, number> = {
  'Trân châu': 6000,
  'Thạch': 6000,
  'Kem Macchiato': 8000,
  'Thêm Shot Espresso': 10000,
};
const sizes: Size[] = ['S', 'M', 'L'];
const options = Object.keys(toppingPrices);
const money = (n: number) => n.toLocaleString('vi-VN') + 'đ';

function SalesContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [cart, setCart] = useState<Line[]>([]);
  const [size, setSize] = useState<Size>('M');
  const [toppings, setToppings] = useState<string[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [selling, setSelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<CounterSaleResponse | null>(null);
  const submitting = useRef(false);
  const saleKey = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchProducts().then((result) => {
      if (active) setProducts(result);
    }).catch((e) => {
      if (active) setMenuError(e instanceof Error ? e.message : 'Cannot load products');
    }).finally(() => { if (active) setMenuLoading(false); });
    return () => { active = false; };
  }, []);

  const add = (product: Product) => {
    if (!product.inStock || selling || receipt) return;
    const ordered = [...toppings].sort();
    const key = `${product.id}-${size}-${ordered.join('|')}`;
    setCart((current) => {
      const found = current.find((line) => line.key === key);
      if (found) return current.map((line) => line.key === key ? { ...line, qty: line.qty + 1 } : line);
      return [...current, {
        key, productId: product.id, name: product.name, unitPrice: product.price,
        size, toppings: ordered, qty: 1,
      }];
    });
    saleKey.current = null;
  };

  const updateQty = (key: string, delta: number) => {
    if (selling || receipt) return;
    setCart((current) => current.map((line) => line.key === key
      ? { ...line, qty: Math.max(0, Math.min(999, line.qty + delta)) }
      : line).filter((line) => line.qty > 0));
    saleKey.current = null;
  };

  const estimatedLine = (line: Line) => (
    line.unitPrice + sizePrices[line.size] +
    line.toppings.reduce((sum, t) => sum + (toppingPrices[t] ?? 0), 0)
  ) * line.qty;
  const estimatedTotal = cart.reduce((sum, line) => sum + estimatedLine(line), 0);

  const finishSale = async () => {
    if (!cart.length || submitting.current || receipt) return;
    submitting.current = true;
    setSelling(true);
    setError(null);
    try {
      if (!saleKey.current) saleKey.current = crypto.randomUUID();
      const result = await createCounterSale({
        method,
        items: cart.map(({ productId, size, qty, toppings }) => ({ productId, size, qty, toppings })),
      }, saleKey.current);
      setReceipt(result);
      setCart([]);
      // Do not clear key until a new sale actually begins; a duplicate click is safe.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cannot create counter sale. Check the order queue before retrying.');
    } finally {
      submitting.current = false;
      setSelling(false);
    }
  };

  const startNextSale = () => {
    setReceipt(null);
    setCart([]);
    setToppings([]);
    setSize('M');
    setError(null);
    saleKey.current = null;
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">BrewLite POS</p>
          <h1 className="mt-1 text-3xl font-bold text-amber-950">Bán hàng tại quầy</h1>
          <p className="mt-2 text-sm text-slate-600">Tạo đơn cho khách mua tại quầy. Không sử dụng giỏ hàng cá nhân.</p>
        </div>
        <Link href="/staff" className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900">Quản lý đơn pha chế</Link>
      </div>

      {receipt ? (
        <section className="mt-7 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-emerald-800">Đã tạo đơn tại quầy #{receipt.orderId}</h2>
          <p className="mt-3 text-sm text-slate-700">Trạng thái: PAID · Phương thức mô phỏng: {receipt.method}</p>
          <p className="mt-2 text-2xl font-bold text-amber-950">{money(receipt.total)}</p>
          <p className="mt-3 text-sm text-slate-600">Bản demo chỉ ghi nhận thanh toán mô phỏng, không thu tiền thật.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={startNextSale} className="rounded-xl bg-amber-800 px-4 py-3 font-semibold text-white">Tạo đơn mới</button>
            <Link href="/staff" className="rounded-xl border border-amber-300 px-4 py-3 font-semibold text-amber-900">Xem hàng chờ pha chế</Link>
          </div>
        </section>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
          <section className="min-w-0 rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-amber-950">Chọn món bán</h2>
            <div className="mt-4 flex flex-wrap gap-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div>
                <label htmlFor="pos-size" className="text-sm font-semibold text-amber-950">Size</label>
                <select id="pos-size" value={size} onChange={(e) => setSize(e.target.value as Size)} className="ml-2 rounded-lg border border-amber-300 bg-white px-3 py-2">
                  {sizes.map((s) => <option key={s} value={s}>{s} {sizePrices[s] ? `(+${money(sizePrices[s])})` : ''}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-amber-950">Topping:</span>
                {options.map((topping) => (
                  <label key={topping} className="flex items-center gap-1 text-xs text-slate-700">
                    <input type="checkbox" checked={toppings.includes(topping)} onChange={(e) => setToppings((current) => e.target.checked ? [...current, topping] : current.filter((s) => s !== topping))}/>
                    {topping} (+{money(toppingPrices[topping])})
                  </label>
                ))}
              </div>
            </div>
            {menuLoading && <p className="mt-5 text-sm text-slate-500">Đang tải menu...</p>}
            {menuError && <p role="alert" className="mt-4 text-sm text-red-600">{menuError}</p>}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {products.map((product) => (
                <div key={product.id} className="rounded-xl border border-amber-100 bg-white p-4">
                  <p className="font-semibold text-slate-900">{product.name}</p>
                  <p className="mt-1 text-sm text-amber-900">{money(product.price)}</p>
                  <button type="button" disabled={!product.inStock || selling} onClick={() => add(product)}
                    className="mt-3 w-full rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                    {product.inStock ? 'Thêm vào đơn bán' : 'Hết nguyên liệu'}
                  </button>
                </div>
              ))}
            </div>
          </section>
          <section className="h-fit rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-amber-950">Đơn bán tại quầy</h2>
            {!cart.length && <p className="mt-4 text-sm text-slate-500">Chưa chọn món.</p>}
            <div className="mt-4 space-y-3">
              {cart.map((line) => (
                <div key={line.key} className="rounded-xl border border-slate-100 p-3">
                  <p className="text-sm font-semibold text-slate-900">{line.name} · Size {line.size}</p>
                  {!!line.toppings.length && <p className="mt-1 text-xs text-slate-500">{line.toppings.join(', ')}</p>}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button type="button" disabled={selling} aria-label="Giảm số lượng" onClick={() => updateQty(line.key, -1)} className="rounded-md border px-2 py-1">-</button>
                      <span className="text-sm">{line.qty}</span>
                      <button type="button" disabled={selling} aria-label="Tăng số lượng" onClick={() => updateQty(line.key, 1)} className="rounded-md border px-2 py-1">+</button>
                    </div>
                    <span className="text-sm font-semibold">{money(estimatedLine(line))}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t pt-4">
              <p className="flex justify-between font-bold"><span>Tạm tính:</span><span>{money(estimatedTotal)}</span></p>
              <p className="mt-2 text-xs text-slate-500">Tổng tiền chính xác được Backend tính theo bảng giá.</p>
            </div>
            <fieldset className="mt-5 space-y-2">
              <legend className="text-sm font-semibold text-slate-900">Xác nhận thanh toán (mô phỏng)</legend>
              <label className="flex items-center gap-2 text-sm"><input type="radio" checked={method === 'CASH'} onChange={() => { setMethod('CASH'); saleKey.current = null; }}/>Tiền mặt</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" checked={method === 'CARD'} onChange={() => { setMethod('CARD'); saleKey.current = null; }}/>Thẻ</label>
            </fieldset>
            {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="button" disabled={!cart.length || selling} onClick={() => void finishSale()}
              className="mt-6 w-full rounded-xl bg-amber-800 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {selling ? 'Đang tạo đơn...' : 'Xác nhận bán và tạo đơn'}
            </button>
            <p className="mt-3 text-xs text-slate-500">Không trừ điểm thưởng, không tạo đơn mua cá nhân. Chỉ dùng trong demo.</p>
          </section>
        </div>
      )}
    </main>
  );
}

export default function StaffSalesPage() {
  return <RoleGate area="/staff/sales" allowed={['STAFF', 'ADMIN']}><SalesContent /></RoleGate>;
}
