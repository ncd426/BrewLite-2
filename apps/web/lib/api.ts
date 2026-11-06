export type Product = {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  inStock: boolean;
};

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// Local Wi-Fi demo: when a phone opens the site via the PC's private LAN IP,
// use that SAME IP for the API instead of the phone's own localhost.
// In production, set NEXT_PUBLIC_API_URL explicitly to a public API origin.
export function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined') return apiBaseUrl;
  try {
    const configured = new URL(apiBaseUrl);
    const host = window.location.hostname;
    const isLocalApi = ['localhost', '127.0.0.1'].includes(configured.hostname);
    const isPrivateLan = /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)
      || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
      || /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host);
    if (isLocalApi && isPrivateLan) {
      configured.hostname = host;
      return configured.origin;
    }
  } catch {
    // Leave the explicit API base unchanged when it cannot be parsed.
  }
  return apiBaseUrl;
}
export const LOYALTY_REDEMPTION_VND = 1000;

export type AuthResponse = {
  id: number;
  name: string;
  email: string;
  accessToken: string;
};

export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export type UserProfile = {
  role: UserRole;
  id: number;
  name: string;
  email: string;
  loyaltyPoints: number;
  createdAt: string;
};

export type OrderItemInput = {
  productId: number;
  size: string;
  qty: number;
  topping?: string[];
  price: number;
};

export type OrderResponse = {
  orderId: number;
  status: string;
  total: number;
  subtotal?: number;
  discountAmount?: number;
  promotionId?: number | null;
  userId: number;
  items: OrderItemInput[];
};

const ACCESS_TOKEN_KEY = 'brewlite-access-token';
const USER_NAME_KEY = 'brewlite-user-name';
const USER_EMAIL_KEY = 'brewlite-user-email';
const AUTH_STATE_EVENT = 'brewlite-auth-change';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(USER_EMAIL_KEY);
}

export function getUserName(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(USER_NAME_KEY);
}

export function saveAccessToken(token: string, name: string, email: string): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  window.localStorage.setItem(USER_NAME_KEY, name);
  window.localStorage.setItem(USER_EMAIL_KEY, email);
  window.dispatchEvent(new Event(AUTH_STATE_EVENT));
}

export function clearAccessToken(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(USER_NAME_KEY);
  window.localStorage.removeItem(USER_EMAIL_KEY);
  window.dispatchEvent(new Event(AUTH_STATE_EVENT));
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body: { message?: string | string[] } = await response.json();
      if (body.message) {
        message = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message;
      }
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }

    if (response.status === 401) clearAccessToken();
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchProducts(): Promise<Product[]> {
  return apiRequest<Product[]>('/products');
}

export async function fetchProduct(id: number): Promise<Product> {
  return apiRequest<Product>(`/products/${id}`);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function fetchMyProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/users/me');
}

export type PromotionPreview = {
  promotionCode: string;
  promotionId: number;
  subtotal: number;
  discountAmount: number;
  total: number;
};

export async function previewPromotion(
  items: OrderItemInput[],
  promotionCode: string,
): Promise<PromotionPreview> {
  return apiRequest<PromotionPreview>('/orders/promotion-preview', {
    method: 'POST',
    body: JSON.stringify({ items, promotionCode }),
  });
}

export async function createOrder(
  items: OrderItemInput[],
  promotionCode?: string,
): Promise<OrderResponse> {
  return apiRequest<OrderResponse>('/orders', {
    method: 'POST',
    body: JSON.stringify({ items, ...(promotionCode ? { promotionCode } : {}) }),
  });
}

export type PaymentMethod = 'CASH' | 'CARD';
export type CheckoutPaymentMethod = 'VNPAY';

export type PaymentPayload = {
  orderId: number;
  method: CheckoutPaymentMethod;
  pointsToRedeem?: number;
};

export type PaymentResponse = {
  id: number;
  orderId: number;
  status: 'PENDING' | 'PAID' | 'PAYMENT_FAILED';
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
  method: CheckoutPaymentMethod;
  amount: number;
  pointsUsed: number;
  checkoutUrl: string | null;
  expiresAt: string | null;
};

export async function processPayment(
  payload: PaymentPayload,
  idempotencyKey: string,
): Promise<PaymentResponse> {
  return apiRequest<PaymentResponse>('/payments', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
}

export type OrderDetailItem = {
  id?: number;
  productId: number;
  productName?: string;
  size: string;
  qty: number;
  price: number;
  unitPrice?: number;
  lineTotal?: number;
  toppings?: string[];
};

export type OrderHistoryItem = {
  id: number;
  orderId?: number;
  status: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED' | string;
  total: number;
  discountAmount?: number;
  paidAmount?: number | null;
  pointsUsed?: number;
  createdAt: string;
  items: OrderDetailItem[];
};

export async function fetchMyOrders(): Promise<OrderHistoryItem[]> {
  return apiRequest<OrderHistoryItem[]>('/orders/me');
}

export async function fetchOrderById(id: number | string): Promise<OrderHistoryItem> {
  return apiRequest<OrderHistoryItem>(`/orders/${id}`);
}
// Backoffice routes are always authorized by NestJS using the role in PostgreSQL.
export type StaffOrder = {
  id: number;
  status: string;
  total: number;
  createdAt: string;
  channel: 'ONLINE' | 'COUNTER';
  user: { name: string };
  items: Array<{
    id: number;
    size: string;
    qty: number;
    toppings: string[] | null;
    product: { name: string };
  }>;
};

export type AdminOverview = {
  users: number;
  products: number;
  orders: number;
  completedOrders: number;
  lowStock: number;
  simulatedRevenue: number;
};
export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  loyaltyPoints: number;
  createdAt: string;
};
export type Ingredient = {
  id: number;
  code: string;
  name: string;
  unit: string;
  stockQuantity: number;
  minStock: number;
  importPrice: number | null;
};
export type RecipeLine = {
  ingredientId: number;
  quantity: number;
  isOptional?: boolean;
};
export type AdminProduct = {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  price: number;
  imageUrl: string | null;
  productIngredients: Array<RecipeLine & { ingredient: { id: number; name: string; unit: string } }>;
};
export type ProductForm = {
  name: string;
  price: number;
  category?: string;
  description?: string;
  imageUrl?: string;
  recipe: RecipeLine[];
};

export const fetchStaffOrders = () =>
  apiRequest<StaffOrder[]>('/management/staff/orders');
export const advanceStaffOrder = (id: number, status: string) =>
  apiRequest<{ id: number; status: string }>(`/management/staff/orders/${id}/status`, {
    method: 'PATCH', body: JSON.stringify({ status }),
  });
export const fetchAdminOverview = () =>
  apiRequest<AdminOverview>('/management/admin/overview');
export const fetchAdminUsers = () =>
  apiRequest<AdminUser[]>('/management/admin/users');
export const updateAdminUserRole = (id: number, role: UserRole) =>
  apiRequest<AdminUser>(`/management/admin/users/${id}/role`, {
    method: 'PATCH', body: JSON.stringify({ role }),
  });
export const fetchAdminProducts = () =>
  apiRequest<AdminProduct[]>('/management/admin/products');
export const createAdminProduct = (data: ProductForm) =>
  apiRequest<AdminProduct>('/management/admin/products', {
    method: 'POST', body: JSON.stringify(data),
  });
export const updateAdminProduct = (id: number, data: ProductForm) =>
  apiRequest<AdminProduct>(`/management/admin/products/${id}`, {
    method: 'PATCH', body: JSON.stringify(data),
  });
export const deleteAdminProduct = (id: number) =>
  apiRequest<{ id: number; deleted: boolean }>(`/management/admin/products/${id}`, {
    method: 'DELETE',
  });
export const fetchAdminInventory = () =>
  apiRequest<Ingredient[]>('/management/admin/inventory');
export const createAdminIngredient = (data: {
  code: string; name: string; unit: string;
  stockQuantity: number; minStock: number;
}) => apiRequest<Ingredient>('/management/admin/inventory', {
  method: 'POST', body: JSON.stringify(data),
});
export const adjustAdminInventory = (id: number, delta: number, minStock?: number) =>
  apiRequest<Ingredient>(`/management/admin/inventory/${id}`, {
    method: 'PATCH', body: JSON.stringify({ delta, ...(minStock !== undefined ? { minStock } : {}) }),
  });

export type CounterSaleInput = {
  items: Array<{ productId: number; size: 'S' | 'M' | 'L'; qty: number; toppings: string[] }>;
  method: PaymentMethod;
};
export type CounterSaleResponse = {
  orderId: number;
  status: 'PAID';
  channel: 'COUNTER';
  total: number;
  method: PaymentMethod;
  paymentId: number;
  replayed: boolean;
};
export const createCounterSale = (data: CounterSaleInput, key: string) =>
  apiRequest<CounterSaleResponse>('/management/staff/sales', {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: JSON.stringify(data),
  });
