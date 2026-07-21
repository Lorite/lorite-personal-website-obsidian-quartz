FROM node:22-slim

# git: used by the Quartz v5 plugin installer to fetch community plugins.
# curl/wget: used by Coolify's healthcheck. Kept from the v4 image.
RUN apt-get update && apt-get install -y git curl wget && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Install node deps first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the app (config, quartz.lock.json, scripts, static, ...).
COPY . .

# Quartz v5 requires community plugins to be installed before building. `npx quartz build` does NOT
# run the `prebuild` npm hook, so install them explicitly here (needs network at image-build time;
# writes to .quartz/plugins, which is .gitignored and therefore not present in the build context).
#
# --from-config is REQUIRED here: without it the installer reads quartz.lock.json, which records local
# plugins by absolute host path (e.g. /home/<user>/.../local-plugins/topmenu). That path doesn't exist
# in the image, so every ./local-plugins/* plugin fails to link. Resolving from quartz.config.yaml uses
# the relative paths instead. Versions of git-hosted plugins stay pinned to the lockfile commits
# (only --latest would change that).
RUN npx quartz plugin install --from-config

# The site is served by scripts/serve.mjs (serve-handler, already a Quartz dependency) rather than
# http-server. http-server 404s every tag that has sub-tags: Quartz writes the page as a flat file
# (tags/engineering.html) while also creating a same-named directory for the children, and
# http-server resolves the directory first, 302s to /tags/engineering/ and finds no index.html.
# serve-handler is what Quartz's own dev server uses, so production now matches `quartz build --serve`.

# The private Obsidian notes repo is mounted here at runtime; publish-sync builds `content/` from it.
ENV NOTES_SOURCE=/root/lorite-obsidian-notes
ENV PORT=3000

EXPOSE 3000

# At container start: sync publishable notes from the mounted vault into content/, build, then serve.
CMD ["/bin/sh", "-c", "if [ -d \"$NOTES_SOURCE\" ] && [ \"$(ls -A \"$NOTES_SOURCE\" 2>/dev/null)\" ]; then npm run sync:published -- --source \"$NOTES_SOURCE\" --dest \"content\"; else echo 'Notes source missing or empty at '$NOTES_SOURCE', skipping sync.'; fi && npx quartz build && node scripts/serve.mjs public"]
