#!/usr/bin/env bash
# Writes a tag and a GitHub Release per planned version for changelogs.

set -euo pipefail

jq -r '.[] | [.tag, .id, .version] | @tsv' "$PLAN" |
    while IFS=$'\t' read -r tag id version; do
        if ! git rev-parse -q --verify "refs/tags/${tag}" > /dev/null; then
            git tag "$tag"
            git push origin "$tag"
        fi

        if gh release view "$tag" > /dev/null 2>&1; then
            echo "= ${tag}"
        else
            gh release create "$tag" \
                --title "$tag" \
                --notes "Automated release of \`${id}\` ${version}."
            echo "+ ${tag}"
        fi
    done
