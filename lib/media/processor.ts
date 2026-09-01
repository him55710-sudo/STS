import { spawn } from "node:child_process";
import type { MediaAssetRecord, MediaProcessorAdapter, MediaProcessingResult } from "./types";

type FfmpegOutputPlan = {
  readonly sourcePath: string;
  readonly nativePath: string;
  readonly nativeUrl: string;
  readonly posterPath: string | null;
  readonly posterUrl: string | null;
  readonly hlsPath: string | null;
  readonly hlsUrl: string | null;
};

export type FfmpegRunResult = { readonly exitCode: number; readonly stderr: string };
export type FfmpegRunner = (args: readonly string[]) => Promise<FfmpegRunResult>;
export type FfmpegPlanResolver = (asset: MediaAssetRecord) => FfmpegOutputPlan;
export type FfmpegOutputInspection = {
  readonly asset: MediaAssetRecord;
  readonly plan: FfmpegOutputPlan;
  readonly stderr: string;
};
export type FfmpegOutputInspector = (inspection: FfmpegOutputInspection) => Promise<MediaProcessingResult>;
export type FfmpegProcessorConfig = {
  readonly runner?: FfmpegRunner;
  readonly resolvePlan: FfmpegPlanResolver;
  readonly inspectOutput: FfmpegOutputInspector;
};

export function buildFfmpegArguments(plan: FfmpegOutputPlan): readonly string[] {
  if (plan.hlsPath && plan.posterPath) {
    return [
      "-y",
      "-i",
      plan.sourcePath,
      "-map",
      "0:v:0",
      "-map",
      "0:a?",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      plan.nativePath,
      "-map",
      "0:v:0",
      "-vf",
      "thumbnail,scale='min(1280,iw)':-2",
      "-frames:v",
      "1",
      plan.posterPath,
      "-map",
      "0:v:0",
      "-map",
      "0:a?",
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      "-f",
      "hls",
      "-hls_time",
      "4",
      "-hls_playlist_type",
      "vod",
      plan.hlsPath,
    ];
  }
  return ["-y", "-i", plan.sourcePath, "-map", "0:v:0", "-frames:v", "1", plan.nativePath];
}

export function createFfmpegMediaProcessorAdapter(config: FfmpegProcessorConfig): MediaProcessorAdapter {
  const runner = config.runner ?? runFfmpeg;
  return {
    async process(asset): Promise<MediaProcessingResult> {
      const plan = config.resolvePlan(asset);
      const result = await runner(buildFfmpegArguments(plan));
      if (result.exitCode !== 0) return { kind: "failed", code: "ffmpeg_failed" };
      return config.inspectOutput({ asset, plan, stderr: result.stderr });
    },
  };
}

export async function runFfmpeg(args: readonly string[]): Promise<FfmpegRunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", [...args], { stdio: ["ignore", "ignore", "pipe"] });
    const stderrChunks: Buffer[] = [];
    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ exitCode: exitCode ?? 1, stderr: Buffer.concat(stderrChunks).toString("utf8") });
    });
  });
}
