FROM python:3.11-slim

WORKDIR /code

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY . .

# Set environment variables for the HuggingFace model
ENV MODEL_NAME="your-huggingface-username/your-model-name"

# Command to run the FastApi application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
