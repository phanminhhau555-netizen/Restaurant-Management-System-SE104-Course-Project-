export const formatNumber = (value, options = {}) =>
  new Intl.NumberFormat("vi-VN", options).format(Number(value) || 0);

export const formatMoney = (amount, { suffix = "đ" } = {}) =>
  `${formatNumber(amount)}${suffix}`;

export const formatDateTime = (value, fallback = "—") => {
  if (!value) return fallback;

  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
