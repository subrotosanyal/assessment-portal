FROM node:20-bullseye
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends docker.io unzip && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 4000
CMD ["node","server.mjs"]
