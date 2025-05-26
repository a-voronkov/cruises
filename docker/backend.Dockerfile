FROM node:18-slim

WORKDIR /app

COPY server/package*.json ./
RUN npm install --include=dev

EXPOSE 3000

CMD ["npm", "run", "dev"] 