#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 <version> [--no-tag]"
  exit 1
fi

VERSION="$1"
CREATE_TAG="yes"

if [[ $# -eq 2 ]]; then
  if [[ "$2" == "--no-tag" ]]; then
    CREATE_TAG="no"
  else
    echo "Unknown option: $2"
    echo "Usage: $0 <version> [--no-tag]"
    exit 1
  fi
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version must be semver-like: X.Y.Z"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

node - "$VERSION" <<'EOF'
const fs = require('fs');

const version = process.argv[2];

function updateJson(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const json = JSON.parse(raw);

  json.version = version;

  if (file.endsWith('package-lock.json')) {
    if (json.packages && json.packages['']) {
      json.packages[''].version = version;
    }
  }

  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
}

updateJson('package.json');

if (fs.existsSync('package-lock.json')) {
  updateJson('package-lock.json');
}
EOF

echo "Updated version to $VERSION"

if [[ "$CREATE_TAG" == "yes" ]]; then
  TAG="v$VERSION"
  if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo "Tag $TAG already exists"
    exit 1
  fi
  git tag "$TAG"
  echo "Created tag $TAG"
fi
