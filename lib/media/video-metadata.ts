import type { MediaUploadMimeType } from "./types";

const BOX_HEADER_BYTES = 8;
const EXTENDED_BOX_HEADER_BYTES = 16;
const MAX_BOXES_TO_SCAN = 512;
const MAX_CONTAINER_DEPTH = 4;
const MAX_EBML_ELEMENTS_TO_SCAN = 1_024;
const MAX_WEBM_METADATA_SCAN_BYTES = 2 * 1024 * 1024;
const DEFAULT_WEBM_TIMECODE_SCALE_NS = 1_000_000;
const NS_PER_MS = 1_000_000;

const EBML_IDS = {
  segment: 0x18538067,
  info: 0x1549a966,
  timecodeScale: 0x2ad7b1,
  duration: 0x4489,
} as const;

type ByteRange = {
  readonly start: number;
  readonly end: number;
};

type IsoBox = {
  readonly type: string;
  readonly payloadStart: number;
  readonly end: number;
  readonly next: number;
};

type EbmlVint = {
  readonly value: number | null;
  readonly length: number;
};

type EbmlElement = {
  readonly id: number;
  readonly payloadStart: number;
  readonly end: number;
  readonly next: number;
};

export function parseStoredVideoDurationMs(bytes: Buffer, mimeType: MediaUploadMimeType): number | null {
  switch (mimeType) {
    case "video/mp4":
    case "video/quicktime":
      return parseIsoBmffDurationMs(bytes);
    case "video/webm":
      return parseWebmDurationMs(bytes);
    case "image/jpeg":
    case "image/png":
    case "image/webp":
      return null;
    default:
      return assertNever(mimeType);
  }
}

function parseWebmDurationMs(bytes: Buffer): number | null {
  const scanRange = { start: 0, end: Math.min(bytes.byteLength, MAX_WEBM_METADATA_SCAN_BYTES) };
  const segment = findEbmlElement(bytes, scanRange, EBML_IDS.segment);
  if (!segment) return null;
  const info = findEbmlElement(bytes, { start: segment.payloadStart, end: segment.end }, EBML_IDS.info);
  return info ? readWebmInfoDurationMs(bytes, info) : null;
}

function readWebmInfoDurationMs(bytes: Buffer, info: EbmlElement): number | null {
  let offset = info.payloadStart;
  let elementsScanned = 0;
  let timecodeScaleNs = DEFAULT_WEBM_TIMECODE_SCALE_NS;
  let duration: number | null = null;

  while (offset < info.end && elementsScanned < MAX_EBML_ELEMENTS_TO_SCAN) {
    const element = readEbmlElement(bytes, offset, info.end);
    if (!element) return null;
    if (element.id === EBML_IDS.timecodeScale) {
      const parsedScale = readEbmlUnsignedInteger(bytes, element);
      if (parsedScale === null || parsedScale <= 0) return null;
      timecodeScaleNs = parsedScale;
    }
    if (element.id === EBML_IDS.duration) {
      duration = readEbmlFloat(bytes, element);
    }
    offset = element.next;
    elementsScanned += 1;
  }

  if (duration === null || duration <= 0 || !Number.isFinite(duration)) return null;
  const milliseconds = Math.ceil((duration * timecodeScaleNs) / NS_PER_MS);
  return Number.isSafeInteger(milliseconds) ? milliseconds : null;
}

function findEbmlElement(bytes: Buffer, range: ByteRange, id: number): EbmlElement | null {
  let offset = range.start;
  let elementsScanned = 0;
  while (offset < range.end && elementsScanned < MAX_EBML_ELEMENTS_TO_SCAN) {
    const element = readEbmlElement(bytes, offset, range.end);
    if (!element) return null;
    if (element.id === id) return element;
    offset = element.next;
    elementsScanned += 1;
  }
  return null;
}

function readEbmlElement(bytes: Buffer, offset: number, rangeEnd: number): EbmlElement | null {
  const id = readEbmlId(bytes, offset, rangeEnd);
  if (!id) return null;
  const sizeOffset = offset + id.length;
  const size = readEbmlSize(bytes, sizeOffset, rangeEnd);
  if (!size) return null;
  const payloadStart = sizeOffset + size.length;
  const elementEnd = size.value === null ? rangeEnd : payloadStart + size.value;
  if (payloadStart > rangeEnd || elementEnd > rangeEnd || elementEnd < payloadStart) return null;
  return { id: id.value, payloadStart, end: elementEnd, next: elementEnd };
}

function readEbmlId(bytes: Buffer, offset: number, rangeEnd: number): { readonly value: number; readonly length: number } | null {
  const length = ebmlVintLength(bytes[offset]);
  if (!length || length > 4 || offset + length > rangeEnd) return null;
  let value = 0;
  for (let index = 0; index < length; index += 1) value = value * 256 + bytes[offset + index];
  return { value, length };
}

function readEbmlSize(bytes: Buffer, offset: number, rangeEnd: number): EbmlVint | null {
  const firstByte = bytes[offset];
  const length = ebmlVintLength(firstByte);
  if (!length || length > 8 || offset + length > rangeEnd) return null;
  const marker = 1 << (8 - length);
  let value = BigInt(firstByte & (marker - 1));
  let maxValue = BigInt(marker - 1);
  for (let index = 1; index < length; index += 1) {
    value = (value << 8n) + BigInt(bytes[offset + index]);
    maxValue = (maxValue << 8n) + 0xffn;
  }
  if (value === maxValue) return { value: null, length };
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? { value: Number(value), length } : null;
}

function ebmlVintLength(firstByte: number | undefined): number | null {
  if (firstByte === undefined || firstByte === 0) return null;
  for (let length = 1; length <= 8; length += 1) {
    if ((firstByte & (1 << (8 - length))) !== 0) return length;
  }
  return null;
}

function readEbmlUnsignedInteger(bytes: Buffer, element: EbmlElement): number | null {
  const size = element.end - element.payloadStart;
  if (size <= 0 || size > 8) return null;
  let value = 0;
  for (let offset = element.payloadStart; offset < element.end; offset += 1) {
    value = value * 256 + bytes[offset];
  }
  return Number.isSafeInteger(value) ? value : null;
}

function readEbmlFloat(bytes: Buffer, element: EbmlElement): number | null {
  const size = element.end - element.payloadStart;
  if (size === 4) return bytes.readFloatBE(element.payloadStart);
  if (size === 8) return bytes.readDoubleBE(element.payloadStart);
  return null;
}

function parseIsoBmffDurationMs(bytes: Buffer): number | null {
  return findMovieHeaderDurationMs(bytes, { start: 0, end: bytes.byteLength }, 0);
}

function findMovieHeaderDurationMs(bytes: Buffer, range: ByteRange, depth: number): number | null {
  let offset = range.start;
  let boxesScanned = 0;
  while (offset + BOX_HEADER_BYTES <= range.end && boxesScanned < MAX_BOXES_TO_SCAN) {
    const box = readIsoBox(bytes, { start: offset, end: range.end });
    if (!box) return null;
    if (box.type === "mvhd") return readMovieHeaderDurationMs(bytes, box);
    if (depth < MAX_CONTAINER_DEPTH && isIsoContainerBox(box.type)) {
      const nestedDuration = findMovieHeaderDurationMs(bytes, { start: box.payloadStart, end: box.end }, depth + 1);
      if (nestedDuration !== null) return nestedDuration;
    }
    offset = box.next;
    boxesScanned += 1;
  }
  return null;
}

function readIsoBox(bytes: Buffer, range: ByteRange): IsoBox | null {
  if (range.start + BOX_HEADER_BYTES > range.end) return null;
  const smallSize = bytes.readUInt32BE(range.start);
  const type = bytes.toString("ascii", range.start + 4, range.start + 8);
  const payloadStart = smallSize === 1 ? range.start + EXTENDED_BOX_HEADER_BYTES : range.start + BOX_HEADER_BYTES;
  if (payloadStart > range.end) return null;
  const boxEnd = isoBoxEnd(bytes, range, smallSize);
  if (boxEnd === null || boxEnd < payloadStart || boxEnd > range.end) return null;
  return { type, payloadStart, end: boxEnd, next: boxEnd };
}

function isoBoxEnd(bytes: Buffer, range: ByteRange, smallSize: number): number | null {
  if (smallSize === 0) return range.end;
  if (smallSize === 1) {
    if (range.start + EXTENDED_BOX_HEADER_BYTES > range.end) return null;
    const largeSize = readUInt64AsSafeNumber(bytes, range.start + BOX_HEADER_BYTES);
    return largeSize === null ? null : range.start + largeSize;
  }
  return range.start + smallSize;
}

function readMovieHeaderDurationMs(bytes: Buffer, box: IsoBox): number | null {
  if (box.payloadStart + 1 > box.end) return null;
  const version = bytes[box.payloadStart];
  if (version === 0) return readVersionZeroDurationMs(bytes, box);
  if (version === 1) return readVersionOneDurationMs(bytes, box);
  return null;
}

function readVersionZeroDurationMs(bytes: Buffer, box: IsoBox): number | null {
  if (box.payloadStart + 20 > box.end) return null;
  return durationMs(bytes.readUInt32BE(box.payloadStart + 16), bytes.readUInt32BE(box.payloadStart + 12));
}

function readVersionOneDurationMs(bytes: Buffer, box: IsoBox): number | null {
  if (box.payloadStart + 32 > box.end) return null;
  const duration = readUInt64AsSafeNumber(bytes, box.payloadStart + 24);
  return duration === null ? null : durationMs(duration, bytes.readUInt32BE(box.payloadStart + 20));
}

function durationMs(duration: number, timescale: number): number | null {
  if (!Number.isFinite(duration) || !Number.isInteger(timescale) || timescale <= 0 || duration <= 0) return null;
  const milliseconds = Math.ceil((duration / timescale) * 1_000);
  return Number.isSafeInteger(milliseconds) ? milliseconds : null;
}

function readUInt64AsSafeNumber(bytes: Buffer, offset: number): number | null {
  const high = bytes.readUInt32BE(offset);
  const low = bytes.readUInt32BE(offset + 4);
  const value = high * 2 ** 32 + low;
  return Number.isSafeInteger(value) ? value : null;
}

function isIsoContainerBox(type: string): boolean {
  return type === "moov" || type === "trak" || type === "mdia" || type === "minf" || type === "stbl" || type === "edts";
}

function assertNever(value: never): never {
  throw new Error(`unexpected media MIME type: ${JSON.stringify(value)}`);
}
