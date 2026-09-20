/* Sayı biçimleri — tüm ekranlar buradan okur. Yerel: tr-TR. */
export const nf = (n) => Math.round(n).toLocaleString("tr-TR");
export const par = (n) => (n < 0 ? `(${nf(-n)})` : nf(n));
export const p1 = (n) => (n * 100).toFixed(1).replace(".", ",");
export const pf = (n) => `%${p1(n)}`;
export const d1 = (n) => n.toFixed(1).replace(".", ",");
export const d2 = (n) => n.toFixed(2).replace(".", ",");
export const mm = (n) => (n / 1000).toFixed(1).replace(".", ",");
