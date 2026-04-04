# AWS Deployment Guide — Project 01 Sentiment Analysis Dashboard

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  AWS S3 + CloudFront                                        │
│  React Frontend (static hosting)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────────┐
│  AWS App Runner / ECS Fargate — Backend (FastAPI :8000)     │
└──────────────────────┬──────────────────────────────────────┘
                       │ Internal
        ┌──────────────┴──────────────┐
        │ Option A                    │ Option B
        ▼                             ▼
┌───────────────────┐    ┌────────────────────────────┐
│ ECS Fargate       │    │ Amazon Comprehend           │
│ NLP Service :8001 │    │ (Managed sentiment API)     │
│ your model.pkl    │    │ No model maintenance needed │
└───────────────────┘    └────────────────────────────┘
```

**Option A** — lift and shift your 3 containers using ECS Fargate, keep your own model.
**Option B** — replace nlp-service with Amazon Comprehend (recommended for production).

---

## AWS Services for Sentiment Analysis

### 1. Ready-to-Use AI (No Model Needed)

| Service                    | What it does                                                                                         | When to use                                                  |
|----------------------------|------------------------------------------------------------------------------------------------------|--------------------------------------------------------------|
| **Amazon Comprehend**      | Built-in sentiment API — returns Positive/Negative/Neutral/Mixed with confidence scores              | Replace your entire nlp-service with one API call            |
| **Amazon Bedrock**         | Claude/Titan/Llama models for sentiment via prompt                                                   | When you need nuanced or domain-specific sentiment           |

> **Amazon Comprehend** is the direct replacement for your current TF-IDF + LogReg model.
> One API call returns the same `{ sentiment, confidence }` output your nlp-service produces today.

### 2. Host Your Own Model (Keep Current Stack)

| Service                    | What it does                                                        | When to use                                           |
|----------------------------|---------------------------------------------------------------------|-------------------------------------------------------|
| **AWS App Runner**         | Run backend container — simplest, no VPC or cluster needed          | Quickest path to production                           |
| **Amazon ECS Fargate**     | Run backend + nlp-service containers in a private VPC               | Best match for your current microservice architecture |
| **Amazon EKS**             | Full Kubernetes for your 3 services                                 | When you need auto-scaling at production scale        |
| **Amazon ECR**             | Store your Docker images                                            | Used with App Runner, ECS, or EKS                     |

### 3. Train and Manage Your Model

| Service                      | What it does                                                              | When to use                                              |
|------------------------------|---------------------------------------------------------------------------|----------------------------------------------------------|
| **AWS SageMaker**            | Train, track experiments (MLflow built-in), register models, deploy       | Upgrade your train.py to a full ML pipeline              |
| **SageMaker Managed Endpoints** | Serve your model.pkl as a REST endpoint                               | Replace nlp-service with a managed inference endpoint    |

### 4. Frontend Hosting

| Service               | What it does                                                                  |
|-----------------------|-------------------------------------------------------------------------------|
| **Amazon S3**         | Host your React build as a static website                                     |
| **Amazon CloudFront** | CDN in front of S3 — HTTPS, low latency globally, free SSL via ACM            |

### 5. Supporting Services

| Service                      | Purpose                                                                   |
|------------------------------|---------------------------------------------------------------------------|
| **AWS API Gateway**          | Rate limiting, auth, monitoring for your /api/v1/predict endpoint         |
| **Amazon CloudWatch**        | Track prediction latency, error rates, request volume, set alarms         |
| **AWS Secrets Manager**      | Store API keys and connection strings instead of .env files               |
| **Amazon S3 (models)**       | Store model.pkl / vectorizer.pkl so containers load models from cloud     |

---

## AWS Services Used

| Service                          | Role                                                     | Free Tier                              |
|----------------------------------|----------------------------------------------------------|----------------------------------------|
| Amazon S3                        | Host React frontend static files                         | 5 GB storage free                      |
| Amazon CloudFront                | CDN for frontend — low latency globally                  | 1 TB data transfer/month free          |
| AWS App Runner                   | Run backend container — simplest option                  | No free tier                           |
| Amazon ECS Fargate               | Run backend + nlp-service containers                     | No free tier                           |
| Amazon ECR                       | Store Docker images                                      | 500 MB/month free                      |
| Amazon Comprehend                | Managed sentiment analysis API (Option B)                | 50,000 units/month free (12 months)    |
| AWS SageMaker Endpoints          | Serve your model.pkl as managed endpoint                 | 2 months free (ml.t2.medium)           |
| Amazon S3 (models)               | Store model.pkl / vectorizer.pkl                         | 5 GB free                              |
| AWS Secrets Manager              | Store secrets instead of .env files                      | 30 days free per secret                |
| Amazon CloudWatch                | Logs, metrics, alarms                                    | 10 custom metrics free                 |
| AWS Certificate Manager (ACM)    | Free SSL/TLS certificates                                | Free                                   |

---

## Prerequisites

- AWS CLI installed: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html
- Docker Desktop installed
- AWS account (free tier: https://aws.amazon.com/free)

```bash
# Configure AWS CLI
aws configure
# Enter: Access Key ID, Secret Access Key, Region (e.g. eu-west-2), output format (json)

# Verify
aws sts get-caller-identity
```

---

## Step 1 — Create ECR Repositories

```bash
AWS_REGION=eu-west-2
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

# Create repositories
aws ecr create-repository --repository-name sentiment/nlp-service --region $AWS_REGION
aws ecr create-repository --repository-name sentiment/backend --region $AWS_REGION

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com
```

---

## Step 2 — Build and Push Docker Images

```bash
ECR=$AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com

# NLP Service
docker build -f docker/Dockerfile.nlp-service -t $ECR/sentiment/nlp-service:latest ./nlp-service
docker push $ECR/sentiment/nlp-service:latest

# Backend
docker build -f docker/Dockerfile.backend -t $ECR/sentiment/backend:latest ./backend
docker push $ECR/sentiment/backend:latest
```

---

## Step 3 — Upload Models to S3

```bash
aws s3 mb s3://sentiment-models-$AWS_ACCOUNT --region $AWS_REGION

aws s3 cp nlp-service/models/model.pkl s3://sentiment-models-$AWS_ACCOUNT/models/model.pkl
aws s3 cp nlp-service/models/vectorizer.pkl s3://sentiment-models-$AWS_ACCOUNT/models/vectorizer.pkl
```

---

## Step 4 — Store Secrets in AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name sentiment/nlp-service-url \
  --secret-string "http://nlp-service:8001" \
  --region $AWS_REGION

aws secretsmanager create-secret \
  --name sentiment/allowed-origins \
  --secret-string '["https://<your-cloudfront-domain>.cloudfront.net"]' \
  --region $AWS_REGION
```

---

## Step 5 — Deploy with App Runner (Simplest Option)

App Runner is the easiest way to deploy a single container — no VPC or cluster setup needed.

```bash
# Create App Runner service for backend
aws apprunner create-service \
  --service-name sentiment-backend \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "'$ECR'/sentiment/backend:latest",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "8000",
        "RuntimeEnvironmentVariables": {
          "NLP_SERVICE_URL": "http://nlp-service:8001",
          "ALLOWED_ORIGINS": "[\"https://<cloudfront-domain>\"]"
        }
      }
    },
    "AutoDeploymentsEnabled": true
  }' \
  --instance-configuration '{"Cpu": "0.5 vCPU", "Memory": "1 GB"}' \
  --region $AWS_REGION
```

---

## Step 5 (Alternative) — Deploy with ECS Fargate

For running both backend + nlp-service together in a private VPC.

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name sentiment-cluster --region $AWS_REGION

# Register task definition (save as task-def.json first — see below)
aws ecs register-task-definition \
  --cli-input-json file://task-def.json \
  --region $AWS_REGION

# Create service
aws ecs create-service \
  --cluster sentiment-cluster \
  --service-name sentiment-service \
  --task-definition sentiment-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<subnet-id>],securityGroups=[<sg-id>],assignPublicIp=ENABLED}" \
  --region $AWS_REGION
```

`task-def.json` example:

```json
{
  "family": "sentiment-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "nlp-service",
      "image": "<ECR>/sentiment/nlp-service:latest",
      "portMappings": [{ "containerPort": 8001 }],
      "essential": true
    },
    {
      "name": "backend",
      "image": "<ECR>/sentiment/backend:latest",
      "portMappings": [{ "containerPort": 8000 }],
      "essential": true,
      "environment": [
        { "name": "NLP_SERVICE_URL", "value": "http://localhost:8001" }
      ],
      "dependsOn": [{ "containerName": "nlp-service", "condition": "START" }]
    }
  ]
}
```

---

## Step 6 — Deploy Frontend to S3 + CloudFront

```bash
# Build React app
cd frontend
REACT_APP_API_URL=https://<app-runner-or-alb-url> npm run build

# Create S3 bucket
aws s3 mb s3://sentiment-frontend-$AWS_ACCOUNT --region $AWS_REGION

# Enable static website hosting
aws s3 website s3://sentiment-frontend-$AWS_ACCOUNT \
  --index-document index.html \
  --error-document index.html

# Upload build
aws s3 sync build/ s3://sentiment-frontend-$AWS_ACCOUNT --delete

# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name sentiment-frontend-$AWS_ACCOUNT.s3-website.$AWS_REGION.amazonaws.com \
  --default-root-object index.html
```

---

## Option B — Use Amazon Comprehend Instead of NLP Service

Replace your nlp-service entirely with Amazon Comprehend.

```bash
# No setup needed — Comprehend is a fully managed API
# Just update backend/app/core/service.py
```

Update `backend/app/core/service.py`:

```python
import boto3

comprehend = boto3.client("comprehend", region_name="eu-west-2")

def predict(text: str) -> dict:
    result = comprehend.detect_sentiment(Text=text, LanguageCode="en")
    sentiment = result["Sentiment"].capitalize()
    scores = result["SentimentScore"]
    confidence = round(max(scores.values()) * 100, 2)
    label = "pos" if sentiment == "Positive" else "neg"
    return {"label": label, "sentiment": sentiment, "confidence": confidence}
```

Add to backend requirements.txt:

```
boto3>=1.34.0
```

---

## Option C — Use SageMaker to Serve Your Own Model

```bash
# Package model for SageMaker
# Upload to S3
aws s3 cp nlp-service/models/model.tar.gz s3://sentiment-models-$AWS_ACCOUNT/sagemaker/

# Create SageMaker endpoint
aws sagemaker create-model \
  --model-name sentiment-model \
  --primary-container '{
    "Image": "683313688378.dkr.ecr.eu-west-2.amazonaws.com/sagemaker-scikit-learn:1.2-1",
    "ModelDataUrl": "s3://sentiment-models-'$AWS_ACCOUNT'/sagemaker/model.tar.gz"
  }' \
  --execution-role-arn arn:aws:iam::<account>:role/SageMakerRole

aws sagemaker create-endpoint-config \
  --endpoint-config-name sentiment-config \
  --production-variants '[{
    "VariantName": "default",
    "ModelName": "sentiment-model",
    "InstanceType": "ml.t2.medium",
    "InitialInstanceCount": 1
  }]'

aws sagemaker create-endpoint \
  --endpoint-name sentiment-endpoint \
  --endpoint-config-name sentiment-config
```

---

## CI/CD — GitHub Actions

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-2

      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push images
        run: |
          docker build -f docker/Dockerfile.nlp-service \
            -t ${{ secrets.ECR_REGISTRY }}/sentiment/nlp-service:${{ github.sha }} ./nlp-service
          docker push ${{ secrets.ECR_REGISTRY }}/sentiment/nlp-service:${{ github.sha }}
          docker build -f docker/Dockerfile.backend \
            -t ${{ secrets.ECR_REGISTRY }}/sentiment/backend:${{ github.sha }} ./backend
          docker push ${{ secrets.ECR_REGISTRY }}/sentiment/backend:${{ github.sha }}

      - name: Deploy frontend to S3
        run: |
          cd frontend && npm ci && npm run build
          aws s3 sync build/ s3://sentiment-frontend-${{ secrets.AWS_ACCOUNT_ID }} --delete
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CF_DISTRIBUTION_ID }} \
            --paths "/*"
```

---

## Monitoring

```bash
# View ECS service logs
aws logs tail /ecs/sentiment-task --follow

# View App Runner logs
aws apprunner list-operations --service-arn <service-arn>

# Create CloudWatch alarm for error rate
aws cloudwatch put-metric-alarm \
  --alarm-name sentiment-5xx-errors \
  --metric-name 5XXError \
  --namespace AWS/AppRunner \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --period 60 \
  --statistic Sum \
  --alarm-actions arn:aws:sns:<region>:<account>:alerts
```

---

## Estimated Monthly Cost

| Service                    | Tier              | Est. Cost          |
|----------------------------|-------------------|--------------------|
| App Runner (backend)       | 0.5 vCPU / 1 GB   | ~$15–20/month      |
| App Runner (nlp-service)   | 0.5 vCPU / 1 GB   | ~$15–20/month      |
| ECR                        | Storage + transfer | ~$1–2/month       |
| S3 (frontend + models)     | Standard          | ~$1/month          |
| CloudFront                 | 1 TB transfer     | ~$0–5/month        |
| Amazon Comprehend          | 50k units free    | $0 (free tier)     |
| CloudWatch                 | Basic             | ~$1–2/month        |
| **Total (Option A)**       |                   | **~$33–50/month**  |
| **Total (Option B)**       |                   | **~$18–30/month**  |

For exact estimates → https://calculator.aws

---

## Teardown

```bash
# Delete ECS service and cluster
aws ecs delete-service --cluster sentiment-cluster --service sentiment-service --force
aws ecs delete-cluster --cluster sentiment-cluster

# Delete ECR images
aws ecr delete-repository --repository-name sentiment/backend --force
aws ecr delete-repository --repository-name sentiment/nlp-service --force

# Empty and delete S3 buckets
aws s3 rm s3://sentiment-frontend-$AWS_ACCOUNT --recursive
aws s3 rb s3://sentiment-frontend-$AWS_ACCOUNT
aws s3 rm s3://sentiment-models-$AWS_ACCOUNT --recursive
aws s3 rb s3://sentiment-models-$AWS_ACCOUNT
```
