# Azure Deployment Guide — Project 01 Sentiment Analysis Dashboard

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Azure Static Web Apps                                      │
│  React Frontend                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────────┐
│  Azure Container Apps — Backend (FastAPI :8000)             │
└──────────────────────┬──────────────────────────────────────┘
                       │ Internal HTTPS
        ┌──────────────┴──────────────┐
        │ Option A                    │ Option B
        ▼                             ▼
┌───────────────────┐    ┌────────────────────────────┐
│ Container Apps    │    │ Azure AI Language API       │
│ NLP Service :8001 │    │ (Text Analytics — managed)  │
│ your model.pkl    │    │ No model maintenance needed │
└───────────────────┘    └────────────────────────────┘
```

**Option A** — lift and shift your 3 containers, keep your own model.
**Option B** — replace nlp-service with Azure AI Language (recommended for production).

---

## Azure Services Used

| Service                        | Role                                                        | Free Tier                          |
|--------------------------------|-------------------------------------------------------------|------------------------------------|
| Azure Static Web Apps          | Host React frontend                                         | Free tier available                |
| Azure Container Apps           | Run backend + nlp-service Docker containers                 | 180,000 vCPU-seconds/month free    |
| Azure Container Registry (ACR) | Store Docker images                                         | Basic: ~$5/month                   |
| Azure AI Language              | Managed sentiment API (Option B)                            | 5,000 transactions/month free      |
| Azure Blob Storage             | Store model.pkl / vectorizer.pkl                            | 5 GB free                          |
| Azure Key Vault                | Store secrets instead of .env files                         | 10,000 operations/month free       |
| Azure Monitor + App Insights   | Track latency, errors, request volume                       | 5 GB logs/month free               |
| Azure API Management           | Rate limiting, auth, API gateway                            | Developer tier available           |

---

## Azure Services for Sentiment Analysis

### 1. Ready-to-Use AI (No Model Needed)

| Service                              | What it does                                                                                      | When to use                                                  |
|--------------------------------------|---------------------------------------------------------------------------------------------------|--------------------------------------------------------------|
| **Azure AI Language** (Text Analytics) | Built-in sentiment API — returns positive/negative/neutral/mixed with confidence scores         | Replace your entire nlp-service with one API call            |
| **Azure OpenAI Service**             | GPT-4/GPT-3.5 for sentiment via prompt                                                            | When you need nuanced or domain-specific sentiment           |

> **Azure AI Language** is the direct replacement for your current TF-IDF + LogReg model.
> One REST call returns the same `{ sentiment, confidence }` output your nlp-service produces today.

### 2. Host Your Own Model (Keep Current Stack)

| Service                        | What it does                                                        | When to use                                          |
|--------------------------------|---------------------------------------------------------------------|------------------------------------------------------|
| **Azure App Service**          | Host FastAPI backend + nlp-service as web apps                      | Simple deployment, no containers needed              |
| **Azure Container Apps**       | Run your 3 Docker containers (frontend, backend, nlp-service)       | Best match for your current microservice architecture |
| **Azure Kubernetes Service**   | Full Kubernetes for your 3 services                                 | When you need auto-scaling at production scale       |
| **Azure Container Registry**   | Store your Docker images                                            | Used with Container Apps or AKS                      |

### 3. Train and Manage Your Model

| Service                          | What it does                                                              | When to use                                              |
|----------------------------------|---------------------------------------------------------------------------|----------------------------------------------------------|
| **Azure Machine Learning**       | Train, track experiments (like MLflow), register models, deploy endpoints | Upgrade your train.py to a full ML pipeline              |
| **Azure ML Managed Endpoints**   | Serve your model.pkl as a REST endpoint                                   | Replace nlp-service with a managed inference endpoint    |

### 4. Frontend Hosting

| Service                    | What it does                                                              |
|----------------------------|---------------------------------------------------------------------------|
| **Azure Static Web Apps**  | Host your React frontend — free tier available, auto CI/CD from GitHub    |
| **Azure CDN**              | Serve static assets globally with low latency                             |

### 5. Supporting Services

| Service                      | Purpose                                                                   |
|------------------------------|---------------------------------------------------------------------------|
| **Azure API Management**     | Rate limiting, auth, monitoring for your /api/v1/predict endpoint         |
| **Azure Monitor + App Insights** | Track prediction latency, error rates, request volume                 |
| **Azure Key Vault**          | Store API keys and connection strings instead of .env files               |
| **Azure Blob Storage**       | Store model.pkl / vectorizer.pkl so containers load models from cloud     |

---

## Prerequisites

- Azure CLI installed: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli
- Docker Desktop installed
- Azure subscription (free account: https://azure.microsoft.com/free)

```bash
# Login
az login

# Set subscription
az account set --subscription "<your-subscription-id>"

# Install Container Apps extension
az extension add --name containerapp --upgrade
```

---

## Step 1 — Create Resource Group

```bash
az group create \
  --name rg-sentiment-dashboard \
  --location uksouth
```

---

## Step 2 — Create Azure Container Registry

```bash
az acr create \
  --resource-group rg-sentiment-dashboard \
  --name sentimentdashboardacr \
  --sku Basic \
  --admin-enabled true

# Get credentials
az acr credential show --name sentimentdashboardacr
```

---

## Step 3 — Build and Push Docker Images

```bash
# Login to ACR
az acr login --name sentimentdashboardacr

ACR=sentimentdashboardacr.azurecr.io

# Build and push nlp-service
docker build -f docker/Dockerfile.nlp-service -t $ACR/nlp-service:latest ./nlp-service
docker push $ACR/nlp-service:latest

# Build and push backend
docker build -f docker/Dockerfile.backend -t $ACR/backend:latest ./backend
docker push $ACR/backend:latest

# Build and push frontend
docker build -f docker/Dockerfile.frontend -t $ACR/frontend:latest ./frontend
docker push $ACR/frontend:latest
```

---

## Step 4 — Create Blob Storage for Models

```bash
az storage account create \
  --name sentimentmodels \
  --resource-group rg-sentiment-dashboard \
  --location uksouth \
  --sku Standard_LRS

az storage container create \
  --name models \
  --account-name sentimentmodels

# Upload trained model files
az storage blob upload \
  --account-name sentimentmodels \
  --container-name models \
  --name model.pkl \
  --file nlp-service/models/model.pkl

az storage blob upload \
  --account-name sentimentmodels \
  --container-name models \
  --name vectorizer.pkl \
  --file nlp-service/models/vectorizer.pkl
```

---

## Step 5 — Create Key Vault for Secrets

```bash
az keyvault create \
  --name sentiment-kv \
  --resource-group rg-sentiment-dashboard \
  --location uksouth

# Store secrets
az keyvault secret set --vault-name sentiment-kv --name NLP-SERVICE-URL --value "http://nlp-service:8001"
az keyvault secret set --vault-name sentiment-kv --name ALLOWED-ORIGINS --value '["https://<your-static-web-app>.azurestaticapps.net"]'
```

---

## Step 6 — Deploy Container Apps Environment

```bash
az containerapp env create \
  --name sentiment-env \
  --resource-group rg-sentiment-dashboard \
  --location uksouth
```

---

## Step 7 — Deploy NLP Service (Option A)

```bash
az containerapp create \
  --name nlp-service \
  --resource-group rg-sentiment-dashboard \
  --environment sentiment-env \
  --image sentimentdashboardacr.azurecr.io/nlp-service:latest \
  --registry-server sentimentdashboardacr.azurecr.io \
  --target-port 8001 \
  --ingress internal \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1.0Gi
```

---

## Step 8 — Deploy Backend

```bash
az containerapp create \
  --name backend \
  --resource-group rg-sentiment-dashboard \
  --environment sentiment-env \
  --image sentimentdashboardacr.azurecr.io/backend:latest \
  --registry-server sentimentdashboardacr.azurecr.io \
  --target-port 8000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 5 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars \
    NLP_SERVICE_URL=http://nlp-service:8001 \
    ALLOWED_ORIGINS='["https://<your-static-web-app>.azurestaticapps.net"]'

# Get backend URL
az containerapp show \
  --name backend \
  --resource-group rg-sentiment-dashboard \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

---

## Step 9 — Deploy Frontend (Azure Static Web Apps)

```bash
az staticwebapp create \
  --name sentiment-frontend \
  --resource-group rg-sentiment-dashboard \
  --location uksouth \
  --source https://github.com/<your-org>/<your-repo> \
  --branch main \
  --app-location /frontend \
  --output-location build \
  --login-with-github
```

Set the backend URL in Static Web Apps config:

```bash
az staticwebapp appsettings set \
  --name sentiment-frontend \
  --setting-names REACT_APP_API_URL=https://<backend-fqdn>
```

---

## Option B — Use Azure AI Language Instead of NLP Service

Replace your nlp-service entirely with the managed Azure AI Language API.

```bash
# Create Azure AI Language resource
az cognitiveservices account create \
  --name sentiment-language \
  --resource-group rg-sentiment-dashboard \
  --kind TextAnalytics \
  --sku F0 \
  --location uksouth \
  --yes

# Get endpoint and key
az cognitiveservices account show \
  --name sentiment-language \
  --resource-group rg-sentiment-dashboard \
  --query properties.endpoint

az cognitiveservices account keys list \
  --name sentiment-language \
  --resource-group rg-sentiment-dashboard
```

Update `backend/app/core/service.py` to call Azure AI Language:

```python
from azure.ai.textanalytics import TextAnalyticsClient
from azure.core.credentials import AzureKeyCredential

client = TextAnalyticsClient(
    endpoint=os.getenv("AZURE_LANGUAGE_ENDPOINT"),
    credential=AzureKeyCredential(os.getenv("AZURE_LANGUAGE_KEY"))
)

def predict(text: str) -> dict:
    result = client.analyze_sentiment([text])[0]
    return {
        "label": result.sentiment[:3],
        "sentiment": result.sentiment.capitalize(),
        "confidence": round(max(
            result.confidence_scores.positive,
            result.confidence_scores.negative,
            result.confidence_scores.neutral
        ) * 100, 2)
    }
```

Add to backend requirements.txt:

```
azure-ai-textanalytics>=5.3.0
```

---

## CI/CD — GitHub Actions

Add to `.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Login to ACR
        run: az acr login --name sentimentdashboardacr

      - name: Build and push images
        run: |
          docker build -f docker/Dockerfile.nlp-service -t sentimentdashboardacr.azurecr.io/nlp-service:${{ github.sha }} ./nlp-service
          docker push sentimentdashboardacr.azurecr.io/nlp-service:${{ github.sha }}
          docker build -f docker/Dockerfile.backend -t sentimentdashboardacr.azurecr.io/backend:${{ github.sha }} ./backend
          docker push sentimentdashboardacr.azurecr.io/backend:${{ github.sha }}

      - name: Deploy to Container Apps
        run: |
          az containerapp update --name nlp-service --resource-group rg-sentiment-dashboard \
            --image sentimentdashboardacr.azurecr.io/nlp-service:${{ github.sha }}
          az containerapp update --name backend --resource-group rg-sentiment-dashboard \
            --image sentimentdashboardacr.azurecr.io/backend:${{ github.sha }}
```

---

## Monitoring

```bash
# View live logs
az containerapp logs show --name backend --resource-group rg-sentiment-dashboard --follow

# View metrics in portal
az monitor metrics list \
  --resource /subscriptions/<sub-id>/resourceGroups/rg-sentiment-dashboard/providers/Microsoft.App/containerApps/backend \
  --metric Requests
```

---

## Estimated Monthly Cost

| Service                  | Tier      | Est. Cost       |
|--------------------------|-----------|-----------------|
| Container Apps (backend) | 0.5 vCPU  | ~$10–15/month   |
| Container Apps (nlp-svc) | 0.5 vCPU  | ~$10–15/month   |
| Container Registry       | Basic     | ~$5/month       |
| Static Web Apps          | Free      | $0              |
| Blob Storage             | LRS       | ~$1/month       |
| Key Vault                | Standard  | ~$1/month       |
| Azure AI Language        | F0 (free) | $0 (5k calls)   |
| **Total (Option A)**     |           | **~$27–37/month** |
| **Total (Option B)**     |           | **~$17–22/month** |

For exact estimates → https://calculator.azure.com

---

## Teardown

```bash
az group delete --name rg-sentiment-dashboard --yes --no-wait
```
