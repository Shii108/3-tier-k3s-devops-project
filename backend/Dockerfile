FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node app.js server.js ./

USER node

EXPOSE 5000

CMD ["npm", "start"]
