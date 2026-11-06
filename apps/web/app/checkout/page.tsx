'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/lib/useCartStore';
import {
  createOrder,
  previewPromotion,
  type PromotionPreview,
  getAccessToken,
  fetchMyProfile,
  LOYALTY_REDEMPTION_VND,
  type CheckoutPaymentMethod,
  type OrderItemInput,
} from '@/lib/api';

export default function CheckoutPage() {
  const router = useRouter();
  const cartItems = useCartStore((state) => state.items);
  const checkoutItemKeys = useCartStore((state) => state.checkoutItemKeys);
  const items = cartItems.filter((item) =>
    checkoutItemKeys === null || checkoutItemKeys.includes(item.key),
  );

  const paymentMethod: CheckoutPaymentMethod = 'VNPAY';
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [promotionCode, setPromotionCode] = useState('');
  const [appliedPromotion, setAppliedPromotion] = useState<(PromotionPreview & {
    cartSignature: string;
  }) | null>(null);
  const [checkingPromotion, setCheckingPromotion] = useState(false);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [availablePoints, setAvailablePoints] = useState<number | null>(null);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [requestedPoints, setRequestedPoints] = useState(0);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.push('/login?redirect=/checkout');
    } else {
      setIsCheckingAuth(false);
      fetchMyProfile()
        .then((profile) => setAvailablePoints(Math.max(0, Math.floor(profile.loyaltyPoints))))
        .catch(() => setAvailablePoints(null))
        .finally(() => setLoadingPoints(false));
    }
  }, [router]);

  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const cartSignature = JSON.stringify(items.map((item) => ({
    key: item.key, productId: item.id, size: item.size,
    qty: item.quantity, price: item.price, toppings: item.toppings,
  })));
  const activePromotion =
    appliedPromotion?.cartSignature === cartSignature &&
    appliedPromotion.promotionCode === promotionCode.trim().toUpperCase()
      ? appliedPromotion
      : null;
  const subtotalPrice = activePromotion?.subtotal ?? totalPrice;
  const totalAfterPromotion = activePromotion?.total ?? totalPrice;
  const maxRedeemable = Math.min(
    availablePoints ?? 0,
    Math.floor(totalAfterPromotion / LOYALTY_REDEMPTION_VND),
  );
  const appliedPoints = useLoyaltyPoints ? requestedPoints : 0;
  const loyaltyDiscount = appliedPoints * LOYALTY_REDEMPTION_VND;
  const estimatedTotal = Math.max(0, totalAfterPromotion - loyaltyDiscount);

  const buildOrderItems = (): OrderItemInput[] => {
    return items.map((item: any) => ({
        productId: Number(item.id),
        size: item.size || 'M',
        qty: item.quantity,
        price: item.price,
        toppings: (item.toppings || item.topping || []).map((t: string) => {
          if (t === 'shot') return 'Thêm Shot Espresso';
          if (t === 'pearl') return 'Trân châu';
          return t;
        }),
      }));
  };

  const handleApplyPromotion = async () => {
    const code = promotionCode.trim().toUpperCase();
    if (!code) {
      setPromotionError('Vui lòng nhập mã giảm giá.');
      return;
    }
    if (items.length === 0 || loading || checkingPromotion) return;
    setCheckingPromotion(true);
    setPromotionError(null);
    setAppliedPromotion(null);
    try {
      const quote = await previewPromotion(buildOrderItems(), code);
      setPromotionCode(quote.promotionCode);
      setAppliedPromotion({ ...quote, cartSignature });
      setRequestedPoints((current) => Math.min(
        current, availablePoints ?? 0,
        Math.floor(quote.total / LOYALTY_REDEMPTION_VND),
      ));
    } catch (err) {
      setPromotionError(err instanceof Error ? err.message : 'Mã giảm giá không hợp lệ.');
    } finally {
      setCheckingPromotion(false);
    }
  };

  const handlePayment = async () => {
    if (items.length === 0) {
      setErrorMessage('Giỏ hàng của bạn đang trống.');
      return;
    }

    if (useLoyaltyPoints && (
      !Number.isInteger(requestedPoints) ||
      requestedPoints <= 0 ||
      requestedPoints > maxRedeemable
    )) {
      setErrorMessage('Số điểm sử dụng không hợp lệ hoặc vượt số điểm hiện có.');
      return;
    }

    if (promotionCode.trim() && !activePromotion) {
      setErrorMessage('Vui lòng bấm Áp dụng để xác nhận mã khuyến mãi trước khi thanh toán.');
      return;
    }
    if (checkingPromotion) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const orderItems = buildOrderItems();

      const order = await createOrder(orderItems, activePromotion?.promotionCode);
      const targetOrderId = order.orderId || (order as any).id;
      if (appliedPoints > Math.floor(order.total / LOYALTY_REDEMPTION_VND)) {
        throw new Error('Tổng tiền đơn hàng đã thay đổi; vui lòng kiểm tra lại giỏ hàng và điểm thưởng.');
      }

      // Create PENDING order only. Payment is confirmed on the NEXT screen.
      const params = new URLSearchParams({
        orderId: String(targetOrderId),
        method: paymentMethod,
        points: String(appliedPoints),
        cartKeys: items.map((item) => item.key).join('|'),
      });
      window.sessionStorage.setItem(
        `brewlite-payment-cart:${targetOrderId}`,
        items.map((item) => item.key).join('|'),
      );
      router.push(
        `/checkout/qr?${params.toString()}` as any,
      );
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Có lỗi phát sinh trong quá trình thanh toán. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500">Đang kiểm tra thông tin đăng nhập...</p>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Giỏ hàng của bạn đang trống</h1>
        <p className="mt-2 text-gray-600">Hãy thêm món nước yêu thích trước khi tiến hành thanh toán.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-amber-600 px-6 py-2.5 font-medium text-white transition hover:bg-amber-700"
        >
          Khám phá thực đơn
        </Link>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Chưa chọn món thanh toán</h1>
        <p className="mt-2 text-gray-600">Quay lại giỏ hàng và chọn ít nhất một món.</p>
        <Link href="/cart" className="mt-6 inline-block rounded-xl bg-amber-600 px-6 py-2.5 font-medium text-white transition hover:bg-amber-700">
          Quay lại giỏ hàng
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Thanh toán đơn hàng</h1>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Thông báo:</p>
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Món đã chọn ({items.length})</h2>
            <div className="divide-y divide-gray-100">
              {items.map((item) => (
                <div key={item.key || `${item.id}-${item.size}`} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      Size: {item.size} {item.toppings?.length ? `| Topping: ${item.toppings.join(', ')}` : ''}
                    </p>
                    <p className="text-xs text-gray-500">Số lượng: x{item.quantity}</p>
                  </div>
                  <span className="font-semibold text-gray-800">
                    {((item.price || 0) * item.quantity).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Phương thức thanh toán</h2>
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="font-medium text-gray-900">VNPay QR</p>
              <p className="text-xs text-gray-600">Thanh toán qua VNPay Sandbox</p>
            </div>
          </div>
        </div>

        <div className="h-fit rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Chi tiết thanh toán</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Tạm tính</span>
              <span>{subtotalPrice.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex justify-between">
              <span>Phí vận chuyển</span>
              <span>0đ</span>
            </div>
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <label htmlFor="promotion-code" className="block font-semibold text-amber-950">
                Mã giảm giá
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="promotion-code"
                  type="text"
                  value={promotionCode}
                  maxLength={50}
                  placeholder="Nhập mã, ví dụ GIAM10"
                  disabled={loading || checkingPromotion}
                  onChange={(event) => {
                    setPromotionCode(event.target.value.toUpperCase());
                    setAppliedPromotion(null);
                    setPromotionError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleApplyPromotion();
                    }
                  }}
                  className="min-w-0 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 uppercase outline-none focus:border-amber-600"
                />
                <button
                  type="button"
                  disabled={loading || checkingPromotion || !promotionCode.trim()}
                  onClick={() => void handleApplyPromotion()}
                  className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {checkingPromotion ? 'Đang kiểm tra...' : 'Áp dụng'}
                </button>
              </div>
              {promotionError && (
                <p role="alert" className="mt-2 text-xs text-red-600">{promotionError}</p>
              )}
              {activePromotion && (
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-emerald-700">
                  <span>
                    Đã áp dụng {activePromotion.promotionCode}; giảm{' '}
                    {activePromotion.discountAmount.toLocaleString('vi-VN')}đ
                  </span>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setPromotionCode('');
                      setAppliedPromotion(null);
                      setPromotionError(null);
                    }}
                    className="shrink-0 font-medium underline"
                  >
                    Bỏ mã
                  </button>
                </div>
              )}
            </div>
            {activePromotion && (
              <div className="flex justify-between text-emerald-700">
                <span>Giảm bằng mã</span>
                <span>−{activePromotion.discountAmount.toLocaleString('vi-VN')}đ</span>
              </div>
            )}
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <p className="font-semibold text-amber-950">Sử dụng điểm thưởng</p>
              {loadingPoints ? (
                <p className="mt-1 text-xs text-gray-500">Đang tải điểm thưởng...</p>
              ) : availablePoints === null ? (
                <p className="mt-1 text-xs text-red-600">Không thể tải số dư điểm. Bạn vẫn có thể thanh toán không dùng điểm.</p>
              ) : (
                <>
                  <p className="mt-1 text-xs text-gray-600">
                    Bạn có <strong>{availablePoints.toLocaleString('vi-VN')} điểm</strong>.
                    Mỗi điểm giảm {LOYALTY_REDEMPTION_VND.toLocaleString('vi-VN')}đ.
                  </p>
                  <label className="mt-3 flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useLoyaltyPoints}
                      disabled={loading || maxRedeemable === 0}
                      onChange={(event) => {
                        setUseLoyaltyPoints(event.target.checked);
                        setRequestedPoints(event.target.checked ? maxRedeemable : 0);
                      }}
                      className="h-4 w-4 accent-amber-600"
                    />
                    <span>Dùng điểm cho đơn này</span>
                  </label>
                  {useLoyaltyPoints && (
                    <div className="mt-3 space-y-2">
                      <label htmlFor="loyalty-points" className="block text-xs">
                        Số điểm muốn sử dụng
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="loyalty-points"
                          type="number"
                          min={1}
                          max={maxRedeemable}
                          step={1}
                          value={requestedPoints}
                          disabled={loading}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            setRequestedPoints(
                              Number.isFinite(value)
                                ? Math.max(0, Math.min(maxRedeemable, Math.floor(value)))
                                : 0,
                            );
                          }}
                          className="min-w-0 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => setRequestedPoints(maxRedeemable)}
                          className="shrink-0 rounded-lg border border-amber-400 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
                        >
                          Dùng tối đa
                        </button>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>Giảm từ điểm</span>
                        <span>−{loyaltyDiscount.toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900 text-base">
              <span>Tổng thanh toán</span>
              <span className="text-amber-700">{estimatedTotal.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>

          <button
            type="button"
            disabled={loading || checkingPromotion}
            onClick={handlePayment}
            className="mt-6 w-full rounded-xl bg-amber-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? 'Đang tạo đơn...' : 'Tiếp tục thanh toán'}
          </button>
        </div>
      </div>
    </main>
  );
}