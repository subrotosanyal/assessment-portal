FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /workspace

RUN apt-get update && apt-get install -y python3 python3-pip bc jq unzip && rm -rf /var/lib/apt/lists/*

RUN npm init -y >/dev/null 2>&1 && npm i -D playwright@1.49.0 http-server >/dev/null 2>&1

COPY . /workspace/
RUN chmod +x /workspace/run_grader.sh

CMD ["/workspace/run_grader.sh"]
