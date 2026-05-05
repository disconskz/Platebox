// Единая валюта проекта — казахстанский тенге (₸).
// Формат: ru-RU разделители тысяч (неразрывный пробел), округление до целых, символ ₸ через узкий неразрывный пробел.
export const fmtMoney = (n: number) => {
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(safe)) + "\u202F₸";
};
export const fmtNum = (n: number) => {
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(safe);
};