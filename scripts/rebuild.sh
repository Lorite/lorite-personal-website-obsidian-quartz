#!/bin/sh
# Rebuild the site from the mounted vault: sync publishable notes into content/, build, add slide folder
# index redirects, then swap the result into public/.
#
# Two callers, so they cannot drift apart again:
#   - the Dockerfile CMD, once at container start, before scripts/serve.mjs
#   - the Coolify scheduled task "Rebuild Quartz Site" (`sh scripts/rebuild.sh`), inside the running
#     container, which is how vault changes reach alejandro.lorite.eu without a website push
#
# The build goes to public.next and is swapped in at the end. serve.mjs reads public/ from disk on every
# request, so building in place would serve an empty folder (404s) for the whole build, and a failed
# build would leave the site empty. Here a failed build leaves the live site untouched.
set -e

if [ -d "$NOTES_SOURCE" ] && [ "$(ls -A "$NOTES_SOURCE" 2>/dev/null)" ]; then
    npm run sync:published -- --source "$NOTES_SOURCE" --dest "content"
else
    echo "Notes source missing or empty at $NOTES_SOURCE, skipping sync."
fi

rm -rf public.next public.prev
npx quartz build --output public.next
node scripts/gen-slide-indexes.mjs public.next/static/slides

if [ -d public ]; then
    mv public public.prev
fi
mv public.next public
rm -rf public.prev
