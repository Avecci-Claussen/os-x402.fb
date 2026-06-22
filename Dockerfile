FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
# The facilitator needs NO private keys — only UNISAT key, fee address, JWT secret, DB.
EXPOSE 4040
CMD ["npx", "tsx", "src/facilitator/server.ts"]
