/**
 * @mediapipe/tasks-vision@20230920.0.0 은 package.json exports에 types를 노출하지 않아
 * 사용 범위만 최소 선언한다 (FilesetResolver / InteractiveSegmenter / ImageSegmenter).
 */
declare module "@mediapipe/tasks-vision" {
  export interface MPMask {
    width: number;
    height: number;
    getAsUint8Array(): Uint8Array;
    close(): void;
  }

  export interface SegmenterResult {
    categoryMask?: MPMask;
    close?: () => void;
  }

  export interface BaseOptions {
    modelAssetPath?: string;
    delegate?: "CPU" | "GPU";
  }

  export class FilesetResolver {
    static forVisionTasks(wasmBasePath: string): Promise<unknown>;
  }

  export class InteractiveSegmenter {
    static createFromOptions(
      fileset: unknown,
      options: {
        baseOptions?: BaseOptions;
        outputCategoryMask?: boolean;
        outputConfidenceMasks?: boolean;
      }
    ): Promise<InteractiveSegmenter>;
    segment(
      image: HTMLImageElement | HTMLCanvasElement,
      roi: { keypoint: { x: number; y: number } }
    ): SegmenterResult;
    close(): void;
  }

  export class ImageSegmenter {
    static createFromOptions(
      fileset: unknown,
      options: {
        baseOptions?: BaseOptions;
        outputCategoryMask?: boolean;
        outputConfidenceMasks?: boolean;
        runningMode?: "IMAGE" | "VIDEO";
      }
    ): Promise<ImageSegmenter>;
    segment(image: HTMLImageElement | HTMLCanvasElement): SegmenterResult;
    close(): void;
  }
}
