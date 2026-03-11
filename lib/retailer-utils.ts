/// lib/retailer-utils.ts

export interface Retailer {
  name: string;
  price: number;
  url: string;
}

/**
 * Returns the retailer with the lowest price.
 * On price tie, the first entry in the array wins (preserves original order preference).
 */
export function getBestRetailer(retailers: Retailer[]): Retailer {
  return retailers.reduce((best, current) =>
    current.price < best.price ? current : best
  );
}
