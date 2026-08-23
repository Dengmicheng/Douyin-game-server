FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./package.json
COPY server.mjs ./server.mjs
EXPOSE 8000
CMD ["node", "server.mjs"]
