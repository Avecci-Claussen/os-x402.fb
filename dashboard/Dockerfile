FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . ./
ARG NEXT_PUBLIC_FACILITATOR_URL=http://127.0.0.1:4040
ENV NEXT_PUBLIC_FACILITATOR_URL=$NEXT_PUBLIC_FACILITATOR_URL
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
