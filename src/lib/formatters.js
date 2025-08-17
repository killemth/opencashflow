export const curr = (n) => (n ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
export const pct  = (n) => `${Math.round((n ?? 0) * 100)}%`;
