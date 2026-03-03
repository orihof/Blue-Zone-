// ---- Affiliate link builders --------------------------------

const IHERB_CODE = process.env.IHERB_AFFILIATE_CODE ?? "";
const AMAZON_TAG = process.env.AMAZON_AFFILIATE_TAG ?? "";

export function buildIHerbUrl(searchQuery: string): string {
  const encoded = encodeURIComponent(searchQuery);
  const base = `https://www.iherb.com/search?kw=${encoded}`;
  return IHERB_CODE ? `${base}&rcode=${IHERB_CODE}` : base;
}

export function buildAmazonUrl(searchQuery: string): string {
  const encoded = encodeURIComponent(searchQuery);
  const base = `https://www.amazon.com/s?k=${encoded}`;
  return AMAZON_TAG ? `${base}&tag=${AMAZON_TAG}` : base;
}
