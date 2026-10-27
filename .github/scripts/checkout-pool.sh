#!/usr/bin/env bash
# Clones the pool branch into $POOL_CHECKOUT, or starts an empty one.
#
# Set REQUIRE_POOL=1 to fail instead when the branch does not exist.

set -euo pipefail
# shellcheck source=.github/scripts/lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

if git clone --depth 1 --branch "$POOL_BRANCH" "$POOL_REMOTE" "$POOL_CHECKOUT" 2>/dev/null; then
    echo "Pool holds $(find "$POOL_CHECKOUT/pool" -name '*.zip' 2>/dev/null | wc -l) artifact(s) on ${POOL_BRANCH}."
elif [ "${REQUIRE_POOL:-0}" = 1 ]; then
    echo "::error::branch ${POOL_BRANCH} does not exist, so there is no pool to read"
    exit 1
else
    echo "No ${POOL_BRANCH} branch yet, starting an empty pool."
    mkdir -p "$POOL_CHECKOUT"
    git -C "$POOL_CHECKOUT" init -q -b "$POOL_BRANCH"
    git -C "$POOL_CHECKOUT" remote add origin "$POOL_REMOTE"
fi

mkdir -p "$POOL_CHECKOUT/pool"

git -C "$POOL_CHECKOUT" config user.name 'github-actions[bot]'
git -C "$POOL_CHECKOUT" config user.email 'github-actions[bot]@users.noreply.github.com'
git -C "$POOL_CHECKOUT" config commit.gpgsign false
