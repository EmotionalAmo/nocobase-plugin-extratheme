#!/bin/bash
# Deploy freshly-built @amo/plugin-extratheme into the running container via the
# bind mount, then restart. NOTE: @amo (non-@nocobase) scope is NOT auto-
# discovered by prefix — the FIRST time you must also register + enable it:
#   docker exec nb-dev-app sh -lc 'cd /app/nocobase && npx nocobase pm add @amo/plugin-extratheme && npx nocobase pm enable @amo/plugin-extratheme'
#   docker exec nb-dev-app sh -lc 'cd /app/nocobase && yarn nocobase db:sync'   # first time, for the new collection
# After that, this script (copy + restart) is enough to ship code changes.
set -e
SRC="$HOME/Developer/nocobase-plugin-dev/packages/plugins/@amo/plugin-extratheme"
DST="/Users/emotionalamo/Developer/nocobase-local/Dev/storage/plugins/@amo/plugin-extratheme"
echo "[deploy] copying build artifacts -> bind mount"
rm -rf "$DST"; mkdir -p "$DST"
cp -R "$SRC/dist" "$DST/dist"
cp "$SRC/package.json" "$DST/"
cp "$SRC"/*.js "$DST/" 2>/dev/null || true
cp "$SRC"/*.d.ts "$DST/" 2>/dev/null || true
cp "$SRC/.npmignore" "$DST/" 2>/dev/null || true
cp "$SRC/README.md" "$DST/" 2>/dev/null || true
echo "[deploy] restarting container"
docker restart nb-dev-app >/dev/null
echo "[deploy] waiting for app to become ready..."
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:13000/api/app:getInfo 2>/dev/null || echo 000)
  if [ "$code" = "200" ] || [ "$code" = "401" ] || [ "$code" = "403" ]; then echo "[deploy] app ready (http $code) after ~${i}x2s"; break; fi
  sleep 2
done
