#!/usr/bin/env bash
# Kodu Vercel'e gönderip orada derleterek üretime yayınla (proje: fersah → https://fersah.vercel.app)
# Not: Vercel GitHub'a bağlandıktan sonra main'e her gönderim zaten otomatik yayınlanır; bu betik elle yayın içindir.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .vercel
echo '{"projectId":"prj_W0ivvgHrpOPiCfpLGBJ5roaMsZHU","orgId":"team_n2XSrQljFcHbxf5PAIOwiQ7i"}' > .vercel/project.json
vercel deploy --prod --yes --token "${VERCEL_TOKEN:-proxyinjected}"
