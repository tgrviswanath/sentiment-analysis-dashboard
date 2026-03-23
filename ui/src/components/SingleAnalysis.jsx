import React, { useState } from "react";
import {
  Box, Button, TextField, Typography, CircularProgress, Chip, LinearProgress,
} from "@mui/material";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import { analyzeSingle } from "../api";

export default function SingleAnalysis() {
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
      const res = await analyzeSingle(text);
      setResult(res.data);
    } catch {
      setError("API error. Make sure FastAPI is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const isPositive = result?.label === "pos";

  return (
    <Box>
      <TextField
        fullWidth
        multiline
        rows={4}
        label="Enter text to analyze"
        value={text}
        onChange={(e) => setText(e.target.value)}
        variant="outlined"
      />
      <Button
        variant="contained"
        onClick={handleAnalyze}
        disabled={loading || !text.trim()}
        sx={{ mt: 2 }}
      >
        {loading ? <CircularProgress size={20} color="inherit" /> : "Analyze"}
      </Button>

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>
      )}

      {result && (
        <Box sx={{ mt: 3 }}>
          <Chip
            icon={isPositive ? <SentimentSatisfiedAltIcon /> : <SentimentVeryDissatisfiedIcon />}
            label={isPositive ? "Positive" : "Negative"}
            color={isPositive ? "success" : "error"}
            sx={{ fontSize: 16, p: 2, mb: 2 }}
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
