const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const compactNumberFormatter = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatRupiah(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Rp0";
  }

  return rupiahFormatter.format(value);
}

export function formatCompactNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0";
  }

  return compactNumberFormatter.format(value);
}
