#!/usr/bin/env bash
# Regenerates index.json from the pool and pushes it when if it changed.

set -euo pipefail
# shellcheck source=.github/scripts/lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

base="$(pages_base_url)"

bun run generate-index \
    --dist "$POOL_CHECKOUT/pool" \
    --base-url "${base}/pool" \
    --out "$POOL_CHECKOUT/index.json"

# Stage the pool too, so a manually deleted artifact also gets deleted with the updated index.
git -C "$POOL_CHECKOUT" add pool index.json
commit_pool \
    "${UNCHANGED_MESSAGE:-Index already matches the pool.}" \
    "${COMMIT_MESSAGE:-Regenerate repository index}"
