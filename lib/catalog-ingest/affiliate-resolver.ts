import { z } from "zod";
import { classifyCommerceUrl } from "../commerce/url-policy";

const affiliateNetworkSchema = z.enum(["linkprice", "sovrn", "direct"]);

export type AffiliateResolutionInput = {
  readonly detailUrl: string;
  readonly sourceProductId: string;
  readonly attribution?: Readonly<Record<string, string>>;
};

export type AffiliateResolutionResult = {
  readonly detailUrl: string;
  readonly affiliateUrl: string | null;
  readonly attribution: Readonly<Record<string, string>> | undefined;
};

export type AffiliateResolverOptions = {
  readonly network: string;
  readonly resolve: (input: AffiliateResolutionInput) => Promise<{
    readonly affiliateUrl: string | null;
    readonly attribution: Readonly<Record<string, string>> | undefined;
    readonly detailUrl?: string;
  }>;
};

export function createAffiliateResolver(options: AffiliateResolverOptions) {
  const network = affiliateNetworkSchema.parse(options.network);
  return {
    network,
    resolve: async (input: AffiliateResolutionInput): Promise<AffiliateResolutionResult> => {
      const detailUrl = normalizeDetailUrl(input.detailUrl);
      if (!detailUrl) {
        return { detailUrl: input.detailUrl, affiliateUrl: null, attribution: input.attribution };
      }
      const result = await options.resolve({ ...input, detailUrl });
      return {
        detailUrl,
        affiliateUrl: result.affiliateUrl ?? null,
        attribution: result.attribution ?? input.attribution,
      };
    },
  };
}

function normalizeDetailUrl(value: string): string | null {
  const classification = classifyCommerceUrl(value);
  return classification.kind === "detail" ? classification.url : null;
}
