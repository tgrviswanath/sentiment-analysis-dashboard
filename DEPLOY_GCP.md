# GCP Deployment Guide — Project 01 Sentiment Analysis Dashboard

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Firebase Hosting                                           │
│  React Frontend (static hosting)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────────┐
│  Cloud Run — Backend (FastAPI :8000)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ Internal HTTPS
        ┌──────────────┴──────────────┐
        │ Option A                    │ Option B
        ▼                             ▼
┌───────────────────┐    ┌────────────────────────────┐
│ Cloud Run         │    │ Google Cloud Natural        │
│ NLP Service :8001 │    │ Language API                │
│ your model.pkl    │    │ (Managed sentiment API)     │
└───────────────────┘    └────────────────────────────┘
```

**Option A** — lift and shift your 3 containers to Cloud Run, keep your own model.
**Option B** — replace nlp-service with Google Cloud Natural Language API (recommended for production).

---

## GCP Services for Sentiment Analysis

### 1. Ready-to-Use AI (No Model Needed)

| Service                              | What it does                                                                                      | When to use                                                  |
|--------------------------------------|---------------------------------------------------------------------------------------------------|--------------------------------------------------------------|
| **Cloud Natural Language API**       | Built-in sentiment API — returns positive/negative/neutral/mixed with confidence scores           | Replace your entire nlp-service with one API call            |
| **Vertex AI Gemini**                 | Gemini Pro for sentiment via prompt                                                               | When you need nuanced or domain-specific sentiment           |

> **Cloud Natural Language API** is the direct replacement for your current TF-IDF + LogReg model.
> One API call returns the same `{ sentiment, confidence }` output your nlp-service produces today.

### 2. Host Your Own Model (Keep Current Stack)

| Service                    | What it does                                                        | When to use                                           |
|----------------------------|---------------------------------------------------------------------|-------------------------------------------------------|
| **Cloud Run**              | Run backend + nlp-service containers — serverless, scales to zero   | Best match for your current microservice architecture |
| **Google Kubernetes Engine** | Full Kubernetes for your 3 services                               | When you need auto-scaling at production scale        |
| **Artifact Registry**      | Store your Docker images                                            | Used with Cloud Run or GKE                            |

### 3. Train and Manage Your Model

| Service                      | What it does                                                              | When to use                                              |
|------------------------------|---------------------------------------------------------------------------|----------------------------------------------------------|
| **Vertex AI**                | Train, track experiments, register models, deploy managed endpoints       | Upgrade your train.py to a full ML pipeline              |
| **Vertex AI Endpoints**      | Serve your model.pkl as a REST endpoint                                   | Replace nlp-service with a managed inference endpoint    |

### 4. Frontend Hosting

| Service                    | What it does                                                              |
|----------------------------|---------------------------------------------------------------------------|
| **Firebase Hosting**       | Host your React frontend — free tier, auto CI/CD from GitHub             |
| **Cloud CDN**              | Serve static assets globally with low latency                             |

### 5. Supporting Services

| Service                      | Purpose                                                                   |
|------------------------------|---------------------------------------------------------------------------|
| **Cloud Endpoints / Apigee** | Rate limiting, auth, monitoring for your /api/v1/predict endpoint         |
| **Cloud Monitoring + Logging** | Track prediction latency, error rates, request volume                   |
| **Secret Manager**           | Store API keys and connection strings instead of .env files               |
| **Cloud Storage**            | Store model.pkl / vectorizer.pkl so containers load models from cloud     |

---

## GCP Services Used

| Service                          | Role                                                     | Free Tier                              |
|----------------------------------|----------------------------------------------------------|----------------------------------------|
| Firebase Hosting                 | Host React frontend                                      | 10 GB storage, 360 MB/day transfer     |
| Cloud Run                        | Run backend + nlp-service containers (serverless)        | 2M requests/month free                 |
| Artifact Registry                | Store Docker images                                      | 0.5 GB/month free                      |
| Cloud Natural Language API       | Managed sentiment analysis (Option B)                    | 5,000 units/month free                 |
| Vertex AI                        | Train, manage, and serve your own model                  | $300 free credits for new accounts     |
| Cloud Storage                    | Store model.pkl / vectorizer.pkl                         | 5 GB/month free                        |
| Secret Manager                   | Store secrets instead of .env files                      | 6 active secrets free                  |
| Cloud Logging + Monitoring       | Logs, metrics, alerts                                    | 50 GB logs/month free                  |
| Cloud Load Balancing             | HTTPS load balancer for backend                          | 5 rules free                           |

---

## Prerequisites

- Google Cloud SDK installed: https://cloud.google.com/sdk/docs/install
- Docker Desktop installed
- GCP account (free tier + $300 credits: https://cloud.google.com/free)

```bash
# Login
gcloud auth login

# Create project
gcloud projects create sentiment-dashboard-project --name="Sentiment Dashboard"
gcloud config set project sentiment-dashboard-project

# Enable billing (required for Cloud Run)
# Go to: https://console.cloud.google.com/billing

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  language.googleapis.com \
  storage.googleapis.com \
  cloudbuild.googleapis.com
```

---

## Step 1 — Create Artifact Registry

```bash
GCP_REGION=europe-west2
PROJECT_ID=sentiment-dashboard-project

gcloud artifacts repositories create sentiment-repo \
  --repository-format=docker \
  --location=$GCP_REGION \
  --description="Sentiment Dashboard Docker images"

# Configure Docker auth
gcloud auth configure-docker $GCP_REGION-docker.pkg.dev
```

---

## Step 2 — Build and Push Docker Images

```bash
AR=$GCP_REGION-docker.pkg.dev/$PROJECT_ID/sentiment-repo

# NLP Service
docker build -f docker/Dockerfile.nlp-service -t $AR/nlp-service:latest ./nlp-service
docker push $AR/nlp-service:latest

# Backend
docker build -f docker/Dockerfile.backend -t $AR/backend:latest ./backend
docker push $AR/backend:latest
```

---

## Step 3 — Upload Models to Cloud Storage

```bash
gsutil mb -l $GCP_REGION gs://sentiment-models-$PROJECT_ID

gsutil cp nlp-service/models/model.pkl gs://sentiment-models-$PROJECT_ID/models/model.pkl
gsutil cp nlp-service/models/vectorizer.pkl gs://sentiment-models-$PROJECT_ID/models/vectorizer.pkl
```

---

## Step 4 — Store Secrets in Secret Manager

```bash
echo -n "http://nlp-service:8001" | \
  gcloud secrets create nlp-service-url --data-file=-

echo -n '["https://<your-firebase-app>.web.app"]' | \
  gcloud secrets create allowed-origins --data-file=-
```

---

## Step 5 — Deploy NLP Service to Cloud Run (Option A)

```bash
gcloud run deploy nlp-service \
  --image $AR/nlp-service:latest \
  --platform managed \
  --region $GCP_REGION \
  --port 8001 \
  --no-allow-unauthenticated \
  --min-instances 1 \
  --max-instances 3 \
  --memory 1Gi \
  --cpu 1
```

---

## Step 6 — Deploy Backend to Cloud Run

```bash
# Get nlp-service internal URL
NLP_URL=$(gcloud run services describe nlp-service \
  --region $GCP_REGION \
  --format "value(status.url)")

gcloud run deploy backend \
  --image $AR/backend:latest \
  --platform managed \
  --region $GCP_REGION \
  --port 8000 \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 5 \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars \
    NLP_SERVICE_URL=$NLP_URL,\
    ALLOWED_ORIGINS='["https://<your-firebase-app>.web.app"]'

# Get backend URL
gcloud run services describe backend \
  --region $GCP_REGION \
  --format "value(status.url)"
```

---

## Step 7 — Deploy Frontend to Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize Firebase in frontend folder
cd frontend
firebase init hosting
# Select: Use existing project → sentiment-dashboard-project
# Public directory: build
# Single-page app: Yes

# Build React app
REACT_APP_API_URL=https://<backend-cloud-run-url> npm run build

# Deploy
firebase deploy --only hosting
```

---

## Option B — Use Google Cloud Natural Language API

Replace your nlp-service entirely with the Cloud Natural Language API.

```bash
# API already enabled in Step 0
# Create service account for backend
gcloud iam service-accounts create sentiment-backend-sa \
  --display-name "Sentiment Backend Service Account"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member "serviceAccount:sentiment-backend-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/cloudlanguage.user"
```

Update `backend/app/core/service.py`:

```python
from google.cloud import language_v1

client = language_v1.LanguageServiceClient()

def predict(text: str) -> dict:
    document = language_v1.Document(
        content=text,
        type_=language_v1.Document.Type.PLAIN_TEXT
    )
    result = client.analyze_sentiment(request={"document": document})
    score = result.document_sentiment.score  # -1.0 to 1.0

    if score >= 0.1:
        sentiment, label = "Positive", "pos"
    elif score <= -0.1:
        sentiment, label = "Negative", "neg"
    else:
        sentiment, label = "Neutral", "neu"

    confidence = round(abs(score) * 100, 2)
    return {"label": label, "sentiment": sentiment, "confidence": confidence}
```

Add to backend requirements.txt:

```
google-cloud-language>=2.13.0
```

Redeploy backend with service account:

```bash
gcloud run deploy backend \
  --image $AR/backend:latest \
  --region $GCP_REGION \
  --service-account sentiment-backend-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --allow-unauthenticated
```

---

## Option C — Use Vertex AI to Serve Your Own Model

```bash
# Upload model to Vertex AI Model Registry
gcloud ai models upload \
  --region=$GCP_REGION \
  --display-name=sentiment-model \
  --container-image-uri=europe-docker.pkg.dev/vertex-ai/prediction/sklearn-cpu.1-2:latest \
  --artifact-uri=gs://sentiment-models-$PROJECT_ID/models/

# Create endpoint
gcloud ai endpoints create \
  --region=$GCP_REGION \
  --display-name=sentiment-endpoint

# Deploy model to endpoint
gcloud ai endpoints deploy-model <endpoint-id> \
  --region=$GCP_REGION \
  --model=<model-id> \
  --display-name=sentiment-model \
  --machine-type=n1-standard-2 \
  --min-replica-count=1 \
  --max-replica-count=3
```

---

## CI/CD — Cloud Build + GitHub Actions

### Cloud Build trigger (cloudbuild.yaml):

```yaml
steps:
  - name: gcr.io/cloud-builders/docker
    args: [build, -f, docker/Dockerfile.nlp-service, -t, '$_AR/nlp-service:$COMMIT_SHA', ./nlp-service]

  - name: gcr.io/cloud-builders/docker
    args: [push, '$_AR/nlp-service:$COMMIT_SHA']

  - name: gcr.io/cloud-builders/docker
    args: [build, -f, docker/Dockerfile.backend, -t, '$_AR/backend:$COMMIT_SHA', ./backend]

  - name: gcr.io/cloud-builders/docker
    args: [push, '$_AR/backend:$COMMIT_SHA']

  - name: gcr.io/google.com/cloudsdktool/cloud-sdk
    args:
      - gcloud
      - run
      - deploy
      - backend
      - --image=$_AR/backend:$COMMIT_SHA
      - --region=europe-west2

substitutions:
  _AR: europe-west2-docker.pkg.dev/sentiment-dashboard-project/sentiment-repo
```

### GitHub Actions:

```yaml
name: Deploy to GCP

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker
        run: gcloud auth configure-docker europe-west2-docker.pkg.dev

      - name: Build and push images
        run: |
          docker build -f docker/Dockerfile.backend \
            -t europe-west2-docker.pkg.dev/${{ secrets.GCP_PROJECT }}/sentiment-repo/backend:${{ github.sha }} ./backend
          docker push europe-west2-docker.pkg.dev/${{ secrets.GCP_PROJECT }}/sentiment-repo/backend:${{ github.sha }}

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy backend \
            --image europe-west2-docker.pkg.dev/${{ secrets.GCP_PROJECT }}/sentiment-repo/backend:${{ github.sha }} \
            --region europe-west2 \
            --platform managed

      - name: Deploy frontend to Firebase
        run: |
          cd frontend && npm ci && npm run build
          npx firebase-tools deploy --only hosting --token ${{ secrets.FIREBASE_TOKEN }}
```

---

## Monitoring

```bash
# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=backend" \
  --limit 50 \
  --format "table(timestamp, textPayload)"

# Stream live logs
gcloud beta run services logs tail backend --region $GCP_REGION

# Create uptime check
gcloud monitoring uptime create \
  --display-name="Backend Health Check" \
  --resource-type=uptime-url \
  --hostname=<backend-cloud-run-url> \
  --path=/health
```

---

## Estimated Monthly Cost

| Service                    | Tier                  | Est. Cost          |
|----------------------------|-----------------------|--------------------|
| Cloud Run (backend)        | 1 vCPU / 1 GB         | ~$10–15/month      |
| Cloud Run (nlp-service)    | 1 vCPU / 1 GB         | ~$10–15/month      |
| Artifact Registry          | Storage + transfer    | ~$1–2/month        |
| Firebase Hosting           | Free tier             | $0                 |
| Cloud Storage (models)     | Standard              | ~$1/month          |
| Secret Manager             | 6 secrets free        | $0                 |
| Cloud Natural Language API | 5k units free         | $0 (free tier)     |
| Cloud Logging              | 50 GB free            | $0                 |
| **Total (Option A)**       |                       | **~$22–33/month**  |
| **Total (Option B)**       |                       | **~$12–18/month**  |

For exact estimates → https://cloud.google.com/products/calculator

---

## Teardown

```bash
# Delete Cloud Run services
gcloud run services delete backend --region $GCP_REGION --quiet
gcloud run services delete nlp-service --region $GCP_REGION --quiet

# Delete Artifact Registry
gcloud artifacts repositories delete sentiment-repo \
  --location=$GCP_REGION --quiet

# Delete Cloud Storage bucket
gsutil rm -r gs://sentiment-models-$PROJECT_ID

# Delete secrets
gcloud secrets delete nlp-service-url --quiet
gcloud secrets delete allowed-origins --quiet

# Delete project (removes everything)
gcloud projects delete $PROJECT_ID
```
