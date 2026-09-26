# syntax=docker/dockerfile:1

# ---- Derleme ----
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

# Tüm proje kopyalanır: postinstall `nuxt prepare` çalıştırıyor ve
# dosyalara ihtiyaç duyuyor.
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

# ---- Çalışma ----
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Nitro sunucu bağımlılıklarını .output içine topluyor; node_modules gerekmez.
# Dosyalar root'a ait, çalıştıran kullanıcı değil: uygulama kendi kodunu
# değiştiremez.
COPY --from=build /app/.output ./.output

# node imajındaki hazır ayrıcalıksız kullanıcı. Sunucuyu root çalıştırmak,
# bir açık bulunduğunda saldırganın elini gereksiz güçlendirir.
USER node

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
