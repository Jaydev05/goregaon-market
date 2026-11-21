import { describe, expect, it } from "vitest";
import { coinsEarnedFor, computeTotals, deliveryFeeFor, distanceKm, maxRedeemableCoins, offerPercent } from "./pricing";

const settings = {
  min_order_amount: 100, delivery_fee: 20, free_delivery_above: 499,
  coin_spend_step: 100, coins_per_step: 1, coin_value: 1, max_coin_redeem_percent: 50, delivery_radius_km: 8,
};

describe("pricing rules", () => {
  it("shows offer % only when selling price is below MRP", () => {
    expect(offerPercent(2999, 1499)).toBe(50);
    expect(offerPercent(1999, 1999)).toBe(0);
    expect(offerPercent(500, 600)).toBe(0);
  });
  it("earns coins per admin rule: ₹100 = 1 coin and ₹100 = 10 coins", () => {
    expect(coinsEarnedFor(350, 100, 1)).toBe(3);
    expect(coinsEarnedFor(350, 100, 10)).toBe(30);
    expect(coinsEarnedFor(50, 50, 5)).toBe(5);
  });
  it("1 coin = ₹1, capped by balance and max redeem %", () => {
    expect(maxRedeemableCoins(400, 1000, 1, 50)).toBe(200);
    expect(maxRedeemableCoins(400, 30, 1, 50)).toBe(30);
    const t = computeTotals({ subtotal: 300, couponDiscount: 0, coinsRequested: 40, coinBalance: 40, settings });
    expect(t.coinDiscount).toBe(40);
    expect(t.total).toBe(300 - 40 + 20);
  });
  it("requires the minimum order amount for delivery", () => {
    expect(computeTotals({ subtotal: 99, couponDiscount: 0, coinsRequested: 0, coinBalance: 0, settings }).meetsMinimum).toBe(false);
    expect(computeTotals({ subtotal: 100, couponDiscount: 0, coinsRequested: 0, coinBalance: 0, settings }).meetsMinimum).toBe(true);
  });
  it("free delivery above the set amount", () => {
    expect(deliveryFeeFor(498, 20, 499)).toBe(20);
    expect(deliveryFeeFor(499, 20, 499)).toBe(0);
  });
  it("measures distance from the Goregaon store", () => {
    const d = distanceKm(18.15426, 73.29155, 19.1663, 72.8526); // store (Goregaon, Raigad) to Goregaon, Mumbai
    expect(d).toBeGreaterThan(8);
    expect(distanceKm(18.15426, 73.29155, 18.158, 73.295)).toBeLessThan(1);
  });
});
