export const key = "budget-sim-v1";
export const SCHEMA_VERSION = 1;
export const CC_MIN_PAYMENT_DOLLARS = 25;
export const DEFAULT_CC_MIN_PCT = 0.03;
export const DEFAULT_CC_CREDIT_LIMIT = 5000;
export const DEFAULT_CC_OVERLIMIT_PCT = 1.0;
export const LIABILITY_TYPES = ["Utility", "Subscription", "Loan", "Living Expense"];
export const LIABILITY_FREQUENCIES = [
  { value: "exact", label: "Exact day" },
  { value: "daily", label: "Daily" },
  { value: "everyOtherDay", label: "Every other day" },
  { value: "weekly", label: "Weekly" },
];
