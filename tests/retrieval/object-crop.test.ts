import { describe, expect, it } from "vitest";
import { cropModeForObject, maskRingsForObject, paddedCropRect } from "../../lib/retrieval/object-crop";

describe("object image crop", () => {
  it("converts a normalized object box to a padded pixel crop", () => {
    expect(
      paddedCropRect({
        box: { x: 0.25, y: 0.2, w: 0.5, h: 0.4 },
        imageWidth: 1000,
        imageHeight: 1000,
        paddingRatio: 0.1,
      })
    ).toEqual({ x: 200, y: 160, width: 600, height: 480 });
  });

  it("clamps a padded crop to the image boundaries", () => {
    expect(
      paddedCropRect({
        box: { x: 0.9, y: 0.92, w: 0.2, h: 0.2 },
        imageWidth: 1000,
        imageHeight: 1000,
        paddingRatio: 0.1,
      })
    ).toEqual({ x: 880, y: 900, width: 120, height: 100 });
  });

  it("prefers valid segmentation rings for background removal", () => {
    expect(maskRingsForObject({
      label: "shirt",
      labelKo: "셔츠",
      category: "fashion",
      x: 0.2,
      y: 0.2,
      w: 0.5,
      h: 0.5,
      confidence: 0.9,
      polygon: [[0.2, 0.2], [0.7, 0.2], [0.7, 0.7]],
      polygons: [
        [[0.2, 0.2], [0.7, 0.2], [0.7, 0.7], [0.2, 0.7]],
        [[0.3, 0.3], [0.4, 0.3]],
      ],
    })).toEqual([
      [[0.2, 0.2], [0.7, 0.2], [0.7, 0.7], [0.2, 0.7]],
    ]);
  });

  it("reports polygon mode only when a valid polygon exists", () => {
    const base = { label: "shirt", labelKo: "셔츠", category: "fashion" as const, x: 0.2, y: 0.2, w: 0.5, h: 0.5, confidence: 0.9 };
    expect(cropModeForObject({ ...base, polygon: [[0.2, 0.2], [0.7, 0.2], [0.7, 0.7]] })).toBe("polygon");
    expect(cropModeForObject(base)).toBe("bbox");
  });
});
