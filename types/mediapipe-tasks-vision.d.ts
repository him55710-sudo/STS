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

  export interface Connection {
    start: number;
    end: number;
  }

  export interface NormalizedLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
  }

  export interface FaceLandmarkerResult {
    faceLandmarks: NormalizedLandmark[][];
    faceBlendshapes?: Array<{ categories: Array<{ categoryName: string; score: number }> }>;
    facialTransformationMatrixes?: unknown[];
    close?: () => void;
  }

  export class FaceLandmarker {
    static createFromOptions(
      fileset: unknown,
      options: {
        baseOptions?: BaseOptions;
        numFaces?: number;
        minFaceDetectionConfidence?: number;
        minFacePresenceConfidence?: number;
        minTrackingConfidence?: number;
        outputFaceBlendshapes?: boolean;
        outputFacialTransformationMatrixes?: boolean;
        runningMode?: "IMAGE" | "VIDEO";
      }
    ): Promise<FaceLandmarker>;
    detect(image: HTMLImageElement | HTMLCanvasElement): FaceLandmarkerResult;
    close(): void;

    static FACE_LANDMARKS_LIPS: Connection[];
    static FACE_LANDMARKS_LEFT_EYE: Connection[];
    static FACE_LANDMARKS_LEFT_EYEBROW: Connection[];
    static FACE_LANDMARKS_LEFT_IRIS: Connection[];
    static FACE_LANDMARKS_RIGHT_EYE: Connection[];
    static FACE_LANDMARKS_RIGHT_EYEBROW: Connection[];
    static FACE_LANDMARKS_RIGHT_IRIS: Connection[];
    static FACE_LANDMARKS_FACE_OVAL: Connection[];
    static FACE_LANDMARKS_CONTOURS: Connection[];
    static FACE_LANDMARKS_TESSELATION: Connection[];
  }
}
