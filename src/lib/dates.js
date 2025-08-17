export const clampDay = (y, m, d) => Math.max(1, Math.min(d, daysInMonth(y, m)));
export const daysInMonth = (year, month1to12) => new Date(year, month1to12, 0).getDate();
export const dayLabel = (d) => d.toString().padStart(2, "0");
export const now = new Date();
