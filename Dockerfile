FROM node:22-slim AS deps
WORKDIR /usr/src/app
COPY package.json .
COPY package-lock.json* .
RUN npm ci

FROM node:22-slim
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules /usr/src/app/node_modules
COPY . .

# Expect notes to be mounted at runtime
ENV NOTES_SOURCE=/root/lorite-obsidian-notes
RUN npm install --global http-server

EXPOSE 3000

CMD ["/bin/sh", "-c", "if [ -d \"$NOTES_SOURCE\" ] && [ \"$(ls -A \"$NOTES_SOURCE\" 2>/dev/null)\" ]; then npm run sync:published -- --source \"$NOTES_SOURCE\" --dest \"content\"; else echo 'Notes source missing or empty at '$NOTES_SOURCE', skipping sync.'; fi && npx quartz build && http-server public -p 3000 -c-1"]
