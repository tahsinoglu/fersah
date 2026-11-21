#!/usr/bin/env bash
# Derle ve Vercel'e üretim olarak yayınla (proje: fersah)
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
cp vercel.json dist/
cd dist && vercel deploy --prod --yes --token "${VERCEL_TOKEN:-proxyinjected}"
