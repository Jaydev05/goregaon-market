// Mirrors the server-side rules in the place_order database function.
export type PricingSettings = {
  min_order_amount: number;
  delivery_fee: number;
  free_delivery_above: number;
  coin_spend_step: number;
  coins_per_step: number;
  coin_value: number;
  max_coin_redeem_percent: number;
  delivery_radius_km: number;
};

export function offerPercent(mrp: number, sellingPrice: number): number {
  if (!mrp || sellingPrice >= mrp) return 0;
  return Math.round(((mrp - sellingPrice) / mrp) * 100);
}

export function coinsEarnedFor(amount: number, step: number, perStep: number): number {
  if (step <= 0 || amount <= 0) return 0;
  return Math.floor(amount / step) * perStep;
}

export function maxRedeemableCoins(
  amountAfterCoupon: number,
  balance: number,
  coinValue: number,
  maxPercent: number,
): number {
  if (coinValue <= 0) return 0;
  const cap = Math.floor((amountAfterCoupon * maxPercent) / 100 / coinValue);
  return Math.max(0, Math.min(balance, cap));
}

export function deliveryFeeFor(subtotal: number, fee: number, freeAbove: number): number {
  return subtotal >= freeAbove ? 0 : fee;
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

export function computeTotals(input: {
  subtotal: number;
  couponDiscount: number;
  coinsRequested: number;
  coinBalance: number;
  settings: PricingSettings;
}) {
  const { subtotal, couponDiscount, coinsRequested, coinBalance, settings: s } = input;
  const afterCoupon = Math.max(subtotal - couponDiscount, 0);
  const maxCoins = maxRedeemableCoins(afterCoupon, coinBalance, s.coin_value, s.max_coin_redeem_percent);
  const coinsUsed = Math.min(Math.max(coinsRequested, 0), maxCoins);
  const coinDiscount = coinsUsed * s.coin_value;
  const fee = deliveryFeeFor(subtotal, s.delivery_fee, s.free_delivery_above);
  const payable = Math.max(afterCoupon - coinDiscount, 0);
  return {
    maxCoins,
    coinsUsed,
    coinDiscount,
    fee,
    total: payable + fee,
    coinsEarned: coinsEarnedFor(payable, s.coin_spend_step, s.coins_per_step),
    meetsMinimum: subtotal >= s.min_order_amount,
  };
}

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })
    .format(n)
    .replace(/\.00$/, "");
