import { CC_MIN_PAYMENT_DOLLARS, DEFAULT_CC_MIN_PCT, DEFAULT_CC_OVERLIMIT_PCT } from './constants';

export function cardMinPayment(balance, carryPct, minPct) {
  const carry = Math.max(0, Math.min(1, Number(carryPct) || 0));
  const desiredCarry = balance * carry;
  const paydownToCarry = Math.max(0, balance - desiredCarry);
  const pct = Number.isFinite(Number(minPct)) ? Math.max(0, Math.min(1, Number(minPct))) : DEFAULT_CC_MIN_PCT;
  const minPay = Math.max(CC_MIN_PAYMENT_DOLLARS, pct * balance);
  return Math.min(Math.max(paydownToCarry, minPay), balance);
}

export function overLimitAdhoc(balance, creditLimit, pct = DEFAULT_CC_OVERLIMIT_PCT) {
  const limit = Math.max(0, Number(creditLimit) || 0);
  if (limit <= 0 || balance <= limit) return 0;
  const over = balance - limit;
  const p = Math.max(0, Math.min(1, Number(pct) ?? DEFAULT_CC_OVERLIMIT_PCT));
  return Math.min(balance, over * p);
}
