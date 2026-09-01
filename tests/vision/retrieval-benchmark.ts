/**
 * Product Retrieval 벤치마크 — Recall@1/3/5, MRR.
 * ground truth = 시드 게시물 객체에 검수·연결된 productId.
 * 입력 시그널 = 객체 라벨 + canonical class + 상품 정색(tone) — 실제 파이프라인과 동일한
 * catalog provider 채점을 사용한다 (웹 provider는 키 없으면 자동 제외).
 *
 * 실행: npx tsx tests/vision/retrieval-benchmark.ts  (또는 node --experimental-strip-types)
 */
import { LOOK_POSTS } from "../../lib/catalog";
import { PRODUCT_TONES } from "../../lib/product-colors";
import { searchCatalog } from "../../lib/retrieval/catalog-provider";
import { buildRetrievalQuery } from "../../lib/retrieval/queries";
import { canonicalClass } from "../../lib/vision-config";
import { existsSync, readFileSync } from "node:fs";
import { evaluateRankingCases, type RankingBenchmarkCase } from "../../lib/retrieval/benchmark-metrics";

let r1 = 0, r3 = 0, r5 = 0, mrrSum = 0, total = 0;
const misses: string[] = [];

for (const post of LOOK_POSTS) {
  for (const obj of post.objects) {
    if (!obj.productId) continue; // unlinked 객체 제외
    total++;
    const detected = {
      label: obj.label,
      labelKo: obj.label,
      category: "fashion" as const,
      x: obj.x, y: obj.y, w: obj.w, h: obj.h,
      confidence: obj.confidence,
      canonicalClass: canonicalClass(obj.label),
      tone: PRODUCT_TONES[obj.productId], // 마스크 색상 추출 대체 (실색 기준)
    };
    const q = buildRetrievalQuery(detected);
    const candidates = searchCatalog(q, 10);
    const rank = candidates.findIndex((c) => c.catalogProductId === obj.productId) + 1;
    if (rank === 1) r1++;
    if (rank >= 1 && rank <= 3) r3++;
    if (rank >= 1 && rank <= 5) r5++;
    if (rank >= 1) mrrSum += 1 / rank;
    else misses.push(`${post.id}/${obj.label} → GT ${obj.productId} not in top10`);
  }
}

console.log(`objects with GT : ${total}`);
console.log(`Recall@1        : ${((r1 / total) * 100).toFixed(0)}%`);
console.log(`Recall@3        : ${((r3 / total) * 100).toFixed(0)}%`);
console.log(`Recall@5        : ${((r5 / total) * 100).toFixed(0)}%`);
console.log(`MRR             : ${(mrrSum / total).toFixed(3)}`);
if (misses.length) console.log("misses:\n  " + misses.join("\n  "));

const visualFixturePath = new URL("./fixtures/visual-ground-truth.json", import.meta.url);
if (!existsSync(visualFixturePath)) {
  console.log("visual rerank benchmark: SKIPPED (no image-level SKU ground truth fixture)");
} else {
  const cases = JSON.parse(readFileSync(visualFixturePath, "utf8")) as RankingBenchmarkCase[];
  const baseline = evaluateRankingCases(cases, "baseline");
  const visual = evaluateRankingCases(cases, "visual");
  console.log(`visual rerank cases: ${cases.length}`);
  console.log(`baseline Recall@1 / @3 / @5: ${(baseline.recallAt1 * 100).toFixed(1)}% / ${(baseline.recallAt3 * 100).toFixed(1)}% / ${(baseline.recallAt5 * 100).toFixed(1)}%`);
  console.log(`visual   Recall@1 / @3 / @5: ${(visual.recallAt1 * 100).toFixed(1)}% / ${(visual.recallAt3 * 100).toFixed(1)}% / ${(visual.recallAt5 * 100).toFixed(1)}%`);
  console.log(`baseline MRR / exact precision / false exact: ${baseline.mrr.toFixed(3)} / ${(baseline.exactSkuPrecision * 100).toFixed(1)}% / ${(baseline.falseExactRate * 100).toFixed(1)}%`);
  console.log(`visual   MRR / exact precision / false exact: ${visual.mrr.toFixed(3)} / ${(visual.exactSkuPrecision * 100).toFixed(1)}% / ${(visual.falseExactRate * 100).toFixed(1)}%`);
  console.log(`visual image coverage: ${(visual.visualImageCoverage * 100).toFixed(1)}%`);
}
