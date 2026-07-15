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
RUN npx quartz plugin install

# Static file server for the built site (Coolify healthchecks port 3000).
RUN npm install --global http-server

# The private Obsidian notes repo is mounted here at runtime; publish-sync builds `content/` from it.
ENV NOTES_SOURCE=/root/lorite-obsidian-notes

EXPOSE 3000

# At container start: sync publishable notes from the mounted vault into content/, build, then serve.
CMD ["/bin/sh", "-c", "if [ -d \"$NOTES_SOURCE\" ] && [ \"$(ls -A \"$NOTES_SOURCE\" 2>/dev/null)\" ]; then npm run sync:published -- --source \"$NOTES_SOURCE\" --dest \"content\"; else echo 'Notes source missing or empty at '$NOTES_SOURCE', skipping sync.'; fi && npx quartz build && http-server public -p 3000 -c-1"]
