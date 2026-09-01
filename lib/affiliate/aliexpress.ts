import { createHmac } from "node:crypto";
import { z } from "zod";

const DEFAULT_ENDPOINT = "https://eco.taobao.com/router/rest";
const MAX_IMAGE_BYTES = 100 * 1024;

const rawProductSchema = z.object({
  product_id: z.union([z.string(), z.number()]),
  product_title: z.string(),
  product_detail_url: z.string(),
  promotion_link: z.string().optional(),
  product_main_image_url: z.string().optional(),
  target_sale_price: z.string().optional(),
  target_sale_price_currency: z.string().optional(),
  sale_price: z.string().optional(),
  sale_price_currency: z.string().optional(),
  commision_rate: z.string().optional(),
  commission_rate: z.string().optional(),
  first_level_category_name: z.string().optional(),
  second_level_category_name: z.string().optional(),
});

const resultSchema = z.object({
  success: z.boolean().optional(),
  data: z
    .object({
      products: z.object({ product: z.array(rawProductSchema).optional() }).optional(),
    })
    .optional(),
});

const responseSchema = z.union([
  z.object({
    aliexpress_affiliate_image_search_response: z.object({ result: resultSchema }),
  }),
  z.object({ result: resultSchema }),
]);

export type AliExpressProduct = {
  readonly id: string;
  readonly title: string;
  readonly detailUrl: string;
  readonly promotionUrl: string | null;
  readonly imageUrl: string | null;
  readonly price: number | null;
  readonly currency: string | null;
  readonly commissionRate: number | null;
  readonly category: string | null;
};

export type AliExpressImage = {
  readonly mimeType: string;
  readonly bytes: ArrayBuffer;
};

type AliExpressImageSearchInput = {
  readonly image: AliExpressImage;
  readonly categoryHint?: string;
  readonly limit?: number;
};

type AliExpressConfig = {
  readonly appKey: string;
  readonly appSecret: string;
  readonly appSignature: string;
  readonly endpoint: string;
  readonly trackingId: string | null;
  readonly mediaUserId: string | null;
};

export function isAliExpressConfigured(): boolean {
  return readConfig() !== null;
}

export function signTopRequest(
  params: Readonly<Record<string, string>>,
  appSecret: string
): string {
  const payload = Object.entries(params)
    .filter(([key, value]) => key !== "sign" && key !== "image_file_bytes" && value.length > 0)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => `${key}${value}`)
    .join("");
  return createHmac("md5", appSecret).update(payload, "utf8").digest("hex").toUpperCase();
}

export function categoryToAliImageCategory(category: string, label: string): string {
  const normalized = label.toLowerCase();
  if (/\b(bag|handbag|backpack|tote|purse)\b|가방|백팩|토트/.test(normalized)) return "3";
  if (/\b(shoe|shoes|sneaker|sneakers|boot|boots|loafer|loafers|sandal|sandals|footwear)\b|신발|운동화|부츠|로퍼|샌들/.test(normalized)) {
    return "4";
  }
  return category === "fashion" ? "0" : "88888888";
}

export function decodeImageDataUrl(dataUrl: string): AliExpressImage | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) return null;
  const bytes = Uint8Array.from(buffer);
  return { mimeType: match[1].toLowerCase(), bytes: bytes.buffer };
}

export async function searchAliExpressByImage(
  input: AliExpressImageSearchInput
): Promise<AliExpressProduct[]> {
  const config = readConfig();
  if (!config || input.image.bytes.byteLength === 0 || input.image.bytes.byteLength > MAX_IMAGE_BYTES) return [];

  const params = buildRequestParams(config, input);
  const form = new FormData();
  Object.entries(params).forEach(([key, value]) => form.append(key, value));
  form.append("sign", signTopRequest(params, config.appSecret));
  form.append(
    "image_file_bytes",
    new Blob([input.image.bytes], { type: input.image.mimeType }),
    input.image.mimeType === "image/png" ? "object.png" : "object.jpg"
  );

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return [];
    const payload: unknown = await response.json();
    return parseAliExpressImageSearchResponse(payload);
  } catch (error) {
    if (error instanceof Error) console.warn(`[affiliate] AliExpress image search failed: ${error.message}`);
    return [];
  }
}

export function parseAliExpressImageSearchResponse(value: unknown): AliExpressProduct[] {
  const parsed = responseSchema.safeParse(value);
  if (!parsed.success) return [];
  const root = "aliexpress_affiliate_image_search_response" in parsed.data
    ? parsed.data.aliexpress_affiliate_image_search_response.result
    : parsed.data.result;
  if (root.success === false) return [];

  return (root.data?.products?.product ?? []).flatMap((product) => {
    const detailUrl = validUrl(product.product_detail_url);
    const title = product.product_title.trim();
    if (!detailUrl || !title) return [];
    return [{
      id: String(product.product_id),
      title,
      detailUrl,
      promotionUrl: validUrl(product.promotion_link),
      imageUrl: validUrl(product.product_main_image_url),
      price: parseNumber(product.target_sale_price ?? product.sale_price),
      currency: clean(product.target_sale_price_currency ?? product.sale_price_currency),
      commissionRate: parseRate(product.commision_rate ?? product.commission_rate),
      category: clean(product.second_level_category_name ?? product.first_level_category_name),
    }];
  });
}

function buildRequestParams(
  config: AliExpressConfig,
  input: AliExpressImageSearchInput
): Record<string, string> {
  const params: Record<string, string> = {
    method: "aliexpress.affiliate.image.search",
    app_key: config.appKey,
    format: "json",
    sign_method: "hmac",
    timestamp: topTimestamp(new Date()),
    v: "2.0",
    app_signature: config.appSignature,
    fields: "product_id,product_title,product_detail_url,promotion_link,product_main_image_url,target_sale_price,target_sale_price_currency,commision_rate,first_level_category_name,second_level_category_name",
    img_cid: input.categoryHint ?? "88888888",
    product_cnt: String(Math.min(20, Math.max(1, input.limit ?? 8))),
    shpt_to: "KR",
    target_currency: "KRW",
    target_language: "ko",
  };
  if (config.trackingId) params.tracking_id = config.trackingId;
  if (config.mediaUserId) params.media_user_id = config.mediaUserId;
  return params;
}

function readConfig(): AliExpressConfig | null {
  const appKey = clean(process.env.ALIEXPRESS_APP_KEY);
  const appSecret = clean(process.env.ALIEXPRESS_APP_SECRET);
  const appSignature = clean(process.env.ALIEXPRESS_APP_SIGNATURE);
  if (!appKey || !appSecret || !appSignature) return null;
  return {
    appKey,
    appSecret,
    appSignature,
    endpoint: clean(process.env.ALIEXPRESS_API_ENDPOINT) ?? DEFAULT_ENDPOINT,
    trackingId: clean(process.env.ALIEXPRESS_TRACKING_ID),
    mediaUserId: clean(process.env.ALIEXPRESS_MEDIA_USER_ID),
  };
}

function topTimestamp(date: Date): string {
  const gmt8 = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return gmt8.toISOString().slice(0, 19).replace("T", " ");
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseRate(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed / 100 : null;
}

function validUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
