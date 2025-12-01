FROM node:20-bullseye
WORKDIR /app

# Install unzip plus a modern Docker CLI (the Debian docker.io package is stuck on API 1.41)
RUN apt-get update \
 && apt-get install -y --no-install-recommends unzip ca-certificates curl \
 && curl -fsSL https://download.docker.com/linux/static/stable/$(uname -m)/docker-26.1.3.tgz \
    | tar xz -C /usr/local/bin --strip-components=1 docker/docker \
 && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install
COPY . .
EXPOSE 4000
CMD ["node","server.mjs"]
