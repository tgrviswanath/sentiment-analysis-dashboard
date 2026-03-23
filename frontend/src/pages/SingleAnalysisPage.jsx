import React, { useState } from "react";
import {
  Box, Button, TextField, Typography,
  CircularProgress, Chip, LinearProgress, Alert,
} from "@mui/material";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import { predictSingle } from "../services/sentimentApi";

export default function SingleAnalysisPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await predictSingle(text);
      setResult(res.data);
    } catch {
      setError("Cannot connect to API. Make sure backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const isPositive = result?.label === "pos";

  return (
    <Box>
      <TextField
        fullWidth multiline rows={4}
        label="Enter text to analyze"
        value={text}
        onChange={(e) => setText(e.target.value)}
        variant="outlined"
      />
      <Button
        variant="contained" size="large"
        onClick={handleAnalyze}
        disabled={loading || !text.trim()}
        sx={{ mt: 2 }}
      >
        {loading ? <CircularProgress size={22} color="inherit" /> : "Analyze Sentiment"}
      </Button>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {result && (
        <Box sx={{ mt: 3, p: 2, border: "1px solid #e0e0e0", borderRadius: 2 }}>
          <Chip
            icon={isPositive ? <SentimentSatisfiedAltIcon /> : <SentimentVeryDissatisfiedIcon />}
            label={result.sentiment}
            color={isPositive ? "success" : "error"}
            sx={{ fontSize: 15, p: 2, mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Confidence: {result.confidence}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={result.confidence}
            color={isPositive ? "success" : "error"}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>
      )}
    </Box>
  );
}
