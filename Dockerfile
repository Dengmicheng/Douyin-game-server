FROM node:22-alpine
WORKDIR /opt/application
ENV NODE_ENV=production
COPY package.json ./package.json
COPY server.mjs ./server.mjs
COPY run.sh ./run.sh
RUN chmod +x run.sh
EXPOSE 8000
CMD ["node", "server.mjs"]