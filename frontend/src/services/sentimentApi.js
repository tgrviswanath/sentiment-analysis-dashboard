import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
});

export const predictSingle = (text) =>
  API.post("/api/v1/predict", { text });

export const predictBatch = (texts) =>
  API.post("/api/v1/predict/batch", { texts });
