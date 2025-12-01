FROM python:3.11-slim
WORKDIR /workspace
COPY grader.py run_grader.sh assets/ ./
# Install docker CLI so we can build/run candidate containers using host docker.sock
RUN apt-get update \
  && apt-get install -y curl docker.io \
  && rm -rf /var/lib/apt/lists/* \
  && pip install --no-cache-dir requests numpy
RUN chmod +x /workspace/run_grader.sh
ENTRYPOINT ["/workspace/run_grader.sh"]
