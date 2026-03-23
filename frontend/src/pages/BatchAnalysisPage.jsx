import React, { useState } from "react";
import {
  Box, Button, TextField, Typography, CircularProgress, Alert,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Chip,
} from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { predictBatch } from "../services/sentimentApi";

export default function BatchAnalysisPage() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBatch = async () => {
    const texts = input.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!texts.length) return;
    setLoading(true);
    setError("");
    try {
      const res = await predictBatch(texts);
      setResults(res.data.map((r, i) => ({
        text: texts[i].length > 60 ? texts[i].slice(0, 60) + "..." : texts[i],
        sentiment: r.sentiment,
        confidence: r.confidence,
      })));
    } catch {
      setError("Cannot connect to API. Make sure backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: "Positive", count: results.filter((r) => r.sentiment === "Positive").length },
    { name: "Negative", count: results.filter((r) => r.sentiment === "Negative").length },
  ];

  return (
    <Box>
      <TextField
        fullWidth multiline rows={5}
        label="Enter multiple texts (one per line)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        variant="outlined"
      />
      <Button
        variant="contained" size="large"
        onClick={handleBatch}
        disabled={loading || !input.trim()}
        sx={{ mt: 2 }}
      >
        {loading ? <CircularProgress size={22} color="inherit" /> : "Analyze Batch"}
      </Button>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {results.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>Sentiment Distribution</Typography>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count">
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.name === "Positive" ? "#4caf50" : "#f44336"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>Results</Typography>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Text</TableCell>
                  <TableCell>Sentiment</TableCell>
                  <TableCell>Confidence (%)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{r.text}</TableCell>
                    <TableCell>
                      <Chip label={r.sentiment} color={r.sentiment === "Positive" ? "success" : "error"} size="small" />
                    </TableCell>
                    <TableCell>{r.confidence}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
