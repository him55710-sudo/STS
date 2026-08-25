export interface OutboundContext {
  readonly postId?: string;
  readonly objectId?: string;
  readonly creatorId?: string;
}

export function buildTrackedOutboundPath(productId: string, context: OutboundContext = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(context)) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString();
  return `/go/${encodeURIComponent(productId)}${suffix ? `?${suffix}` : ""}`;
}
