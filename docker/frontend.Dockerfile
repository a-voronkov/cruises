FROM node:18-slim

WORKDIR /app

COPY front.react/package*.json ./
RUN npm install

EXPOSE 5173

CMD ["npm", "run", "dev"] 