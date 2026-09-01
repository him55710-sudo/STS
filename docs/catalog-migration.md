# Catalog Migration

This migration introduces the canonical catalog ingestion model used by Todo 3.

It adds:

- canonical catalog products and offers
- source identities with source/fallback uniqueness
- import batches and checkpoints
- quarantine rows for rejected imports
- vector metadata for retrieval and future embedding storage
- `user_roles` plus an admin-only RLS path

Notes:

- Preview flows must be read-only and must not write catalog tables.
- Conflicting source identities should be quarantined instead of being merged implicitly.
- Verified detail URLs are only allowed to stay verified when the canonical detail URL remains canonical.
- `post_objects.exactness` is widened to the canonical match-state set and existing rows are backfilled deterministically.
