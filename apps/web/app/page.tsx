'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { fetchProducts, type Product } from '@/lib/api';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    fetchProducts()
      .then((data) => {
        if (mounted) setProducts(data);
      })
      .catch(() => {
        if (mounted) setError('Hiện chưa thể tải thực đơn. Vui lòng thử lại sau ít phút.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-8">
      {loading ? (
        <div className="rounded-2xl border border-amber-100 bg-white p-8 text-center text-amber-700">
          Đang tải danh sách sản phẩm...
        </div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-center text-red-700">
          {error}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-200 bg-white p-8 text-center text-gray-600">
          Không có sản phẩm nào để hiển thị.
        </div>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      )}
    </main>
  );
}
