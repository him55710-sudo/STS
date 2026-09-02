import { writeSocialSeedManifest } from "../lib/social-seed/generator";

const projectRoot = process.cwd();
const manifest = writeSocialSeedManifest(projectRoot);
const counts = {
  records: manifest.records.length,
  categories: new Set(manifest.records.map((record) => record.category)).size,
  contentKinds: new Set(manifest.records.map((record) => record.contentKind)).size,
  creators: new Set(manifest.records.map((record) => record.creator.id)).size,
  localImages: manifest.constraints.actualLocalImageAssetCount,
  localVideos: manifest.constraints.actualLocalVideoAssetCount,
  videoBackedRecords: manifest.constraints.videoBackedRecordCount,
};

console.log(JSON.stringify({ output: "data/social/seed-manifest.json", counts, limitation: manifest.constraints.videoLimitation }, null, 2));
