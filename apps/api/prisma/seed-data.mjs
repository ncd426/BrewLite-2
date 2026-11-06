// BrewLite development fixtures (money is always integer VND).
// Product details and local image paths match apps/web/lib/mock-data.ts.
export const PRODUCTS = [
  { name: 'Cappuccino', price: 39000, imageUrl: '/images/cappuccino.jpg' },
  { name: 'C\u00e0 ph\u00ea Phin', price: 25000, imageUrl: '/images/ca_phe_phin.jpg' },
  { name: 'B\u1ea1c X\u1ec9u S\u00e0i G\u00f2n', price: 32000, imageUrl: '/images/bac_xiu_sai_gon.jpg' },
  { name: 'C\u00e0 ph\u00ea \u0110en \u0110\u00e1', price: 25000, imageUrl: '/images/ca_phe_den_da.jpg' },
  { name: 'Tr\u00e0 \u0110\u00e0o Cam S\u1ea3', price: 38000, imageUrl: '/images/tra_dao_cam_sa.jpg' },
  { name: 'Matcha Latte', price: 45000, imageUrl: '/images/matcha_latte.jpg' },
  { name: 'C\u00e0 Ph\u00ea Mu\u1ed1i BrewLite', price: 35000, imageUrl: '/images/ca_phe_muoi_brewlite.jpg' },
  { name: 'Cold Brew Cam V\u00e0ng BrewLite', price: 45000, imageUrl: '/images/cold_brew_cam_vang_brewlite.jpg' },
];

export const INGREDIENTS = [
  { code: 'I001', name: 'C\u00e0 ph\u00ea b\u1ed9t rang xay', unit: 'g' },
  { code: 'I002', name: 'Espresso', unit: 'ml' },
  { code: 'I003', name: 'Cold Brew Concentrate', unit: 'ml' },
  { code: 'I004', name: 'S\u1eefa t\u01b0\u01a1i kh\u00f4ng \u0111\u01b0\u1eddng', unit: 'ml' },
  { code: 'I005', name: 'S\u1eefa \u0111\u1eb7c', unit: 'ml' },
  { code: 'I006', name: '\u0110\u01b0\u1eddng', unit: 'g' },
  { code: 'I007', name: 'N\u01b0\u1edbc \u0111\u01b0\u1eddng', unit: 'ml' },
  { code: 'I008', name: 'N\u01b0\u1edbc n\u00f3ng', unit: 'ml' },
  { code: 'I009', name: 'N\u01b0\u1edbc l\u1ecdc', unit: 'ml' },
  { code: 'I010', name: '\u0110\u00e1 vi\u00ean', unit: 'g' },
  { code: 'I011', name: 'B\u1ed9t cacao', unit: 'g' },
  { code: 'I012', name: 'Tr\u00e0 \u0111en \u0111\u00e3 \u1ee7', unit: 'ml' },
  { code: 'I013', name: 'Syrup \u0111\u00e0o', unit: 'ml' },
  { code: 'I014', name: 'N\u01b0\u1edbc cam t\u01b0\u01a1i', unit: 'ml' },
  { code: 'I015', name: 'S\u1ea3 t\u01b0\u01a1i', unit: 'g' },
  { code: 'I016', name: '\u0110\u00e0o ng\u00e2m', unit: 'g' },
  { code: 'I017', name: 'Cam t\u01b0\u01a1i/cam v\u00e0ng', unit: 'g' },
  { code: 'I018', name: 'B\u1ed9t Matcha', unit: 'g' },
  { code: 'I019', name: 'Kem b\u00e9o th\u1ef1c v\u1eadt', unit: 'ml' },
  { code: 'I020', name: 'Whipping cream', unit: 'ml' },
  { code: 'I021', name: 'Mu\u1ed1i', unit: 'g' },
  { code: 'I022', name: 'Syrup cam', unit: 'ml' },
].map((ingredient) => ({
  ...ingredient,
  stockQuantity: 10000,
  minStock: 500,
  importPrice: null,
}));

export const RECIPES = [
  ['Cappuccino', 'I002', 30],
  ['Cappuccino', 'I004', 120],
  ['Cappuccino', 'I011', 2],
  ['Cappuccino', 'I006', 5, true],
  ['C\u00e0 ph\u00ea Phin', 'I001', 25],
  ['C\u00e0 ph\u00ea Phin', 'I008', 100],
  ['C\u00e0 ph\u00ea Phin', 'I006', 10, true],
  ['C\u00e0 ph\u00ea Phin', 'I010', 150],
  ['B\u1ea1c X\u1ec9u S\u00e0i G\u00f2n', 'I002', 30],
  ['B\u1ea1c X\u1ec9u S\u00e0i G\u00f2n', 'I004', 100],
  ['B\u1ea1c X\u1ec9u S\u00e0i G\u00f2n', 'I005', 30],
  ['B\u1ea1c X\u1ec9u S\u00e0i G\u00f2n', 'I010', 150],
  ['C\u00e0 ph\u00ea \u0110en \u0110\u00e1', 'I002', 40],
  ['C\u00e0 ph\u00ea \u0110en \u0110\u00e1', 'I009', 20],
  ['C\u00e0 ph\u00ea \u0110en \u0110\u00e1', 'I006', 10, true],
  ['C\u00e0 ph\u00ea \u0110en \u0110\u00e1', 'I010', 150],
  ['Tr\u00e0 \u0110\u00e0o Cam S\u1ea3', 'I012', 120],
  ['Tr\u00e0 \u0110\u00e0o Cam S\u1ea3', 'I013', 20],
  ['Tr\u00e0 \u0110\u00e0o Cam S\u1ea3', 'I007', 15],
  ['Tr\u00e0 \u0110\u00e0o Cam S\u1ea3', 'I014', 30],
  ['Tr\u00e0 \u0110\u00e0o Cam S\u1ea3', 'I015', 10],
  ['Tr\u00e0 \u0110\u00e0o Cam S\u1ea3', 'I016', 40],
  ['Tr\u00e0 \u0110\u00e0o Cam S\u1ea3', 'I017', 20],
  ['Tr\u00e0 \u0110\u00e0o Cam S\u1ea3', 'I010', 150],
  ['Matcha Latte', 'I018', 5],
  ['Matcha Latte', 'I008', 40],
  ['Matcha Latte', 'I004', 120],
  ['Matcha Latte', 'I005', 15],
  ['Matcha Latte', 'I006', 5],
  ['Matcha Latte', 'I010', 150],
  ['C\u00e0 Ph\u00ea Mu\u1ed1i BrewLite', 'I002', 40],
  ['C\u00e0 Ph\u00ea Mu\u1ed1i BrewLite', 'I005', 25],
  ['C\u00e0 Ph\u00ea Mu\u1ed1i BrewLite', 'I019', 30],
  ['C\u00e0 Ph\u00ea Mu\u1ed1i BrewLite', 'I020', 30],
  ['C\u00e0 Ph\u00ea Mu\u1ed1i BrewLite', 'I021', 1],
  ['C\u00e0 Ph\u00ea Mu\u1ed1i BrewLite', 'I004', 10],
  ['C\u00e0 Ph\u00ea Mu\u1ed1i BrewLite', 'I010', 150],
  ['Cold Brew Cam V\u00e0ng BrewLite', 'I003', 80],
  ['Cold Brew Cam V\u00e0ng BrewLite', 'I014', 60],
  ['Cold Brew Cam V\u00e0ng BrewLite', 'I022', 15],
  ['Cold Brew Cam V\u00e0ng BrewLite', 'I009', 30],
  ['Cold Brew Cam V\u00e0ng BrewLite', 'I017', 30],
  ['Cold Brew Cam V\u00e0ng BrewLite', 'I010', 150],
].map(([productName, ingredientCode, quantity, isOptional = false]) => ({
  productName,
  ingredientCode,
  quantity,
  isOptional,
}));

// Only local .test accounts. Password is provided at runtime by the developer.
export const USERS = [
  { name: 'BrewLite Demo', email: 'demo@brewlite.test' },
  { name: 'Kh\u00e1ch h\u00e0ng 1', email: 'khach1@brewlite.test' },
  { name: 'Kh\u00e1ch h\u00e0ng 2', email: 'khach2@brewlite.test' },
];

export const PROMOTIONS = [
  { code: 'WELCOME10', type: 'PERCENT', value: 10, minOrderTotal: 50000, isActive: true, startsAt: null, expiresAt: null },
  { code: 'GIAM20K', type: 'FIXED', value: 20000, minOrderTotal: 100000, isActive: true, startsAt: null, expiresAt: null },
  { code: 'HETHAN15', type: 'PERCENT', value: 15, minOrderTotal: 50000, isActive: true, startsAt: null, expiresAt: '2025-01-01T00:00:00.000Z' },
  { code: 'TAMNGUNG30', type: 'PERCENT', value: 30, minOrderTotal: 80000, isActive: false, startsAt: null, expiresAt: null },
  { code: 'CHUAHD5K', type: 'FIXED', value: 5000, minOrderTotal: 40000, isActive: true, startsAt: '2099-01-01T00:00:00.000Z', expiresAt: null },
];

// Demo only: these conventions have to be approved by the team before the
// real orders/payments services calculate charges and loyalty points.
export const SIZE_SURCHARGE = Object.freeze({ S: 0, M: 5000, L: 10000 });
export const TOPPING_PRICE = Object.freeze({
  'Tr\u00e2n ch\u00e2u': 7000,
  'Kem cheese': 9000,
  'Th\u1ea1ch c\u00e0 ph\u00ea': 5000,
});
export const LOYALTY_VND_PER_POINT = 10000;

// A stable payment key is the anchor for idempotent sample orders on re-runs.
// Every example order has a payment record (including pending/failed attempts).
export const ORDERS = [
  { key: 'brewlite-seed-v1-pending', email: 'demo@brewlite.test', status: 'PENDING', paymentStatus: 'PENDING', method: 'CARD', promotion: null, items: [
    { name: 'Cappuccino', size: 'S', qty: 1, toppings: [] },
  ] },
  { key: 'brewlite-seed-v1-paid', email: 'demo@brewlite.test', status: 'PAID', paymentStatus: 'SUCCESS', method: 'VNPAY', promotion: 'WELCOME10', items: [
    { name: 'C\u00e0 Ph\u00ea Mu\u1ed1i BrewLite', size: 'M', qty: 2, toppings: ['Tr\u00e2n ch\u00e2u'] },
  ] },
  { key: 'brewlite-seed-v1-preparing', email: 'khach1@brewlite.test', status: 'PREPARING', paymentStatus: 'SUCCESS', method: 'CARD', promotion: 'GIAM20K', items: [
    { name: 'Cold Brew Cam V\u00e0ng BrewLite', size: 'L', qty: 1, toppings: ['Kem cheese'] },
    { name: 'Cappuccino', size: 'M', qty: 1, toppings: [] },
  ] },
  { key: 'brewlite-seed-v1-ready', email: 'khach2@brewlite.test', status: 'READY', paymentStatus: 'SUCCESS', method: 'VNPAY', promotion: 'WELCOME10', items: [
    { name: 'Tr\u00e0 \u0110\u00e0o Cam S\u1ea3', size: 'M', qty: 2, toppings: ['Th\u1ea1ch c\u00e0 ph\u00ea'] },
  ] },
  { key: 'brewlite-seed-v1-completed', email: 'demo@brewlite.test', status: 'COMPLETED', paymentStatus: 'SUCCESS', method: 'CARD', promotion: 'GIAM20K', items: [
    { name: 'B\u1ea1c X\u1ec9u S\u00e0i G\u00f2n', size: 'L', qty: 1, toppings: [] },
    { name: 'C\u00e0 ph\u00ea Phin', size: 'M', qty: 2, toppings: [] },
  ] },
  { key: 'brewlite-seed-v1-failed', email: 'khach2@brewlite.test', status: 'PAYMENT_FAILED', paymentStatus: 'FAILED', method: 'VNPAY', promotion: null, items: [
    { name: 'Matcha Latte', size: 'M', qty: 1, toppings: [] },
  ] },
  { key: 'brewlite-seed-v1-cancelled', email: 'khach1@brewlite.test', status: 'CANCELLED', paymentStatus: 'FAILED', method: 'CARD', promotion: null, items: [
    { name: 'C\u00e0 ph\u00ea \u0110en \u0110\u00e1', size: 'S', qty: 1, toppings: [] },
  ] },
];

export function unitPrice(basePrice, size, toppings) {
  if (!(size in SIZE_SURCHARGE)) throw new Error(`Unknown size: ${size}`);
  let price = basePrice + SIZE_SURCHARGE[size];
  for (const topping of toppings) {
    if (!(topping in TOPPING_PRICE)) throw new Error(`Unknown topping: ${topping}`);
    price += TOPPING_PRICE[topping];
  }
  return price;
}

export function discountFor(subtotal, promotion) {
  if (!promotion) return 0;
  if (subtotal < promotion.minOrderTotal) {
    throw new Error(`Promotion ${promotion.code} needs min order ${promotion.minOrderTotal}`);
  }
  if (promotion.type === 'PERCENT') {
    return Math.min(subtotal, Math.floor((subtotal * promotion.value) / 100));
  }
  if (promotion.type === 'FIXED') {
    return Math.min(subtotal, promotion.value);
  }
  throw new Error(`Unknown discount type: ${promotion.type}`);
}

export function validateFixtures() {
  if (PRODUCTS.length < 8) throw new Error('At least 8 products are required');
  const unique = (items, key, type) => {
    if (new Set(items.map((item) => item[key])).size !== items.length) {
      throw new Error(`Duplicate ${type} ${key}`);
    }
  };
  unique(PRODUCTS, 'name', 'product');
  unique(USERS, 'email', 'user');
  unique(PROMOTIONS, 'code', 'promotion');
  unique(ORDERS, 'key', 'order');
  const productNames = new Set(PRODUCTS.map((product) => product.name));
  const userEmails = new Set(USERS.map((user) => user.email));
  const activePromotions = new Map(PROMOTIONS.map((promotion) => [promotion.code, promotion]));
  for (const product of PRODUCTS) {
    if (!Number.isInteger(product.price) || product.price <= 0) {
      throw new Error(`Invalid price: ${product.name}`);
    }
    if (!/^\/images\/[A-Za-z0-9._-]+$/.test(product.imageUrl)) {
      throw new Error(`Invalid local product image: ${product.name}`);
    }
  }
  unique(INGREDIENTS, 'code', 'ingredient');
  unique(INGREDIENTS, 'name', 'ingredient');
  const ingredientCodes = new Set(INGREDIENTS.map((ingredient) => ingredient.code));
  for (const ingredient of INGREDIENTS) {
    if (!['g', 'ml'].includes(ingredient.unit) || !Number.isInteger(ingredient.stockQuantity) || ingredient.stockQuantity < 0) {
      throw new Error(`Invalid ingredient fixture: ${ingredient.code}`);
    }
  }
  for (const recipe of RECIPES) {
    if (!productNames.has(recipe.productName) || !ingredientCodes.has(recipe.ingredientCode) || !Number.isInteger(recipe.quantity) || recipe.quantity <= 0) {
      throw new Error(`Invalid recipe fixture: ${JSON.stringify(recipe)}`);
    }
  }
  if (new Set(RECIPES.map((recipe) => `${recipe.productName}:${recipe.ingredientCode}`)).size !== RECIPES.length) {
    throw new Error('Recipe product/ingredient pairs must be unique');
  }
  for (const product of PRODUCTS) {
    if (!RECIPES.some((recipe) => recipe.productName === product.name && !recipe.isOptional)) {
      throw new Error(`Product has no required recipe: ${product.name}`);
    }
  }
  for (const promo of PROMOTIONS) {
    if (promo.type === 'PERCENT' && (promo.value <= 0 || promo.value > 100)) throw new Error(`Invalid percentage: ${promo.code}`);
    if (promo.type === 'FIXED' && promo.value <= 0) throw new Error(`Invalid fixed discount: ${promo.code}`);
  }
  for (const order of ORDERS) {
    if (!userEmails.has(order.email)) throw new Error(`Unknown order user: ${order.email}`);
    if (!order.items.length) throw new Error(`Order ${order.key} is empty`);
    let subtotal = 0;
    for (const item of order.items) {
      if (!productNames.has(item.name)) throw new Error(`Unknown product: ${item.name}`);
      if (!Number.isInteger(item.qty) || item.qty < 1) throw new Error(`Invalid qty: ${order.key}`);
      const product = PRODUCTS.find((p) => p.name === item.name);
      subtotal += unitPrice(product.price, item.size, item.toppings) * item.qty;
    }
    if (order.promotion) {
      const promo = activePromotions.get(order.promotion);
      if (!promo || !promo.isActive || promo.expiresAt || promo.startsAt) throw new Error(`Invalid order promotion: ${order.key}`);
      discountFor(subtotal, promo);
    }
    if (['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(order.status) !== (order.paymentStatus === 'SUCCESS')) {
      throw new Error(`Order/payment status mismatch: ${order.key}`);
    }
  }
  return true;
}
