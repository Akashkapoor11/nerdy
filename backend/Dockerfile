FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
RUN mkdir -p data && chown -R node:node /app
USER node
EXPOSE 3001
CMD ["node", "src/app.js"]
