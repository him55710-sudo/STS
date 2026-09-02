# Task 5 Stored-Media Validation Evidence

Recorded: 2026-09-02T04:03:03+09:00

Scope: validation slice only. This does not claim all of Task 5 complete.

## Scenario

Stored media completion rejects invalid stored payloads before processing enqueue while preserving assetId-only owner/storage authorization.

## Invocation

```powershell
npx vitest run tests/security/media-stored-validation.test.ts tests/security/media-upload-limits.test.ts tests/security/media-upload-initiate-limits.test.ts
```

## Binary Observable

```text
Test Files  3 passed (3)
Tests  22 passed (22)
```

Covered stored-byte checks:

- Declared-vs-actual size mismatch rejects before completion RPC.
- Stored MIME mismatch rejects before completion RPC.
- Stored byte signature mismatch rejects before completion RPC.
- Stored image dimensions/pixel bomb rejects before completion RPC.
- Stored MP4 duration over limit rejects before completion RPC using stored metadata, not row/client duration.
- Stored MP4 without verifiable duration rejects before completion RPC.

## Typecheck

```powershell
npx tsc --noEmit --pretty false --incremental false
```

Binary observable: exit code 0, no diagnostics.

## Remaining Queue Worker Dependency

The queue worker still needs its production `MediaProcessorAdapter` binding for actual transcode/HLS/poster/moderation work. This validation slice only gates payloads before enqueue; it does not implement request-time transcode or worker media processing.
