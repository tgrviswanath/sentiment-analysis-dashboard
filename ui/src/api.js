import axios from "axios";

const API = axios.create({ baseURL: "/api" });

export const analyzeSingle = (text) => API.post("/predict", { text });

export const analyzeBatch = (texts) =>
  Promise.all(texts.map((text) => API.post("/predict", { text })));
