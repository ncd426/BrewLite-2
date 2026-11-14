'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchProduct, type Product } from '@/lib/api';
import { useCartStore } from '@/lib/useCartStore';

const SIZE_OPTIONS = [
  { id: 'S', name: 'Size S', surcharge: 0 },
  { id: 'M', name: 'Size M', surcharge: 5000 },
  { id: 'L', name: 'Size L', surcharge: 10000 },
];

const TOPPING_OPTIONS = [
  { id: 'pearl', name: 'Trân châu', price: 6000 },
  { id: 'jelly', name: 'Thạch', price: 6000 },
  { id: 'macchiato', name: 'Kem Macchiato', price: 8000 },
  { id: 'shot', name: 'Thêm Shot Espresso', price: 10000 },
];
export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>('S');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);

  const handleToggleTopping = (toppingId: string) => {
    setSelectedToppings((prev) =>
      prev.includes(toppingId)
        ? prev.filter((id) => id !== toppingId)
        : [...prev, toppingId]
    );
  };
  const addToCart = useCartStore((state) => state.addToCart);

  useEffect(() => {
    const productId = Number(params.id);
    fetchProduct(productId)
      .then(setProduct)
      .catch(() => {
        setLoadError(true);
        setProduct(null);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const totalPrice = useMemo(() => {
    if (!product) return 0;
    const sizeSurcharge = SIZE_OPTIONS.find((s) => s.id === selectedSize)?.surcharge || 0;
    const toppingTotal = selectedToppings.reduce((sum, toppingId) => {
      const topping = TOPPING_OPTIONS.find((t) => t.id === toppingId);
      return sum + (topping ? topping.price : 0);
    }, 0);
    return product.price + sizeSurcharge + toppingTotal;
  }, [product, selectedSize, selectedToppings]);

  if (loading) {
    return <main className="mx-auto max-w-2xl p-8 text-amber-700">Đang tải sản phẩm...</main>;
  }

  if (!product) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="mb-4 text-3xl font-bold">{loadError ? 'Không thể tải sản phẩm' : 'Không tìm thấy sản phẩm'}</h1>
        {loadError && <p className="mb-5 text-gray-600">Vui lòng thử lại sau ít phút.</p>}
        <Link href="/" className="rounded-xl bg-amber-700 px-4 py-2 text-white">Quay lại menu</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <Link href="/" className="mb-6 inline-block text-sm font-medium text-amber-700">
        ← Quay lại menu
      </Link>

      <div className="grid gap-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-amber-100 md:grid-cols-2">
        <img src={product.imageUrl} alt={product.name} className="h-[360px] w-full rounded-2xl object-cover" />

        <div className="space-y-5">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-amber-700">BrewLite</p>
            <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
            <p className={`mt-2 text-sm font-medium ${product.inStock ? 'text-emerald-700' : 'text-red-700'}`}>
              {product.inStock ? 'Còn hàng' : 'Hết hàng'}
            </p>
          </div>

          <p className="text-gray-600">
            Một món uống nóng thơm ngon, phù hợp cho những buổi sáng năng động hoặc thư giãn giữa ngày.
          </p>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Chọn kích cỡ</p>
            <div className="flex gap-2">
              {['S', 'M', 'L'].map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`rounded-full border px-3 py-2 text-sm font-medium ${
                    selectedSize === size ? 'border-amber-700 bg-amber-700 text-white' : 'border-amber-200 bg-white text-amber-900'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Chọn Topping</p>
            <div className="space-y-2">
              {TOPPING_OPTIONS.map((topping) => {
                const isChecked = selectedToppings.includes(topping.id);
                return (
                  <label 
                    key={topping.id} 
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 text-sm transition ${
                      isChecked ? 'border-amber-700 bg-amber-50' : 'border-amber-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleTopping(topping.id)}
                      className="h-4 w-4 rounded text-amber-700"
                      />
                      <span>{topping.name}</span>
                    </div>
                    <span className="font-semibold text-amber-800">
                      +{topping.price.toLocaleString('vi-VN')}đ
                    </span>
                  </label>
                );
            })}
            </div>
          </div>

          <div className="rounded-2xl bg-amber-50 p-4">
            <p className="text-sm text-gray-600">Giá dự kiến</p>
            <p className="text-2xl font-bold text-amber-700">{totalPrice.toLocaleString('vi-VN')}đ</p>
          </div>

          <button
            disabled={!product.inStock}
            onClick={() =>
              addToCart({
                id: product.id,
                name: product.name,
                price: totalPrice,
                imageUrl: product.imageUrl,
                size: selectedSize,
                toppings: selectedToppings,
              })
            }
            className="w-full rounded-xl bg-amber-700 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {product.inStock ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
          </button>
        </div>
      </div>
    </main>
  );
}
