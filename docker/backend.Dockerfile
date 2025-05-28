# Dockerfile для NestJS backend (dev)
FROM node:20

WORKDIR /app

COPY server/package*.json ./
RUN npm install --legacy-peer-deps

CMD ["npm", "run", "start:dev"] 