FROM python:3.11-slim
RUN apt-get update && apt-get install -y poppler-utils && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
COPY run_grader.sh /workspace/run_grader.sh
COPY grader.py /workspace/grader.py
RUN chmod +x /workspace/run_grader.sh
RUN pip install --no-cache-dir pdfminer.six python-pptx
ENTRYPOINT ["/workspace/run_grader.sh"]
