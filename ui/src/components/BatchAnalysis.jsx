import React, { useState } from "react";
import {
  Box, Button, TextField, Typography, CircularProgress,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Chip,
} from "@mui/material";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { analyzeBatch } from "../api";

export default function BatchAnalysis() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBatch = async () => {
    const lines = input.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setLoading(true);
    setError("");
    try {
      const responses = await analyzeBatch(lines);
      setResults(
        responses.map((r, i) => ({
          text: lines[i].length > 60 ? lines[i].slice(0, 60) + "..." : lines[i],
          label: r.data.label === "pos" ? "Positive" : "Negative",
          confidence: r.data.confidence,
        }))
      );
    } catch {
      setError("API error. Make sure FastAPI is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const positiveCount = results.filter((r) => r.label === "Positive").length;
  const negativeCount = results.filter((r) => r.label === "Negative").length;
  const chartData = [
    { name: "Positive", count: positiveCount },
    { name: "Negative", count: negativeCount },
  ];

  return (
    <Box>
      <TextField
        fullWidth
        multiline
        rows={5}
        label="Enter multiple texts (one per line)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        variant="outlined"
      />
      <Button
        variant="contained"
        onClick={handleBatch}
        disabled={loading || !input.trim()}
        sx={{ mt: 2 }}
      >
        {loading ? <CircularProgress size={20} color="inherit" /> : "Analyze Batch"}
      </Button>

      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}

      {results.length > 0 && (
        <Box sx={{ mt: 3 }}>
          {/* Chart */}
          <Typography variant="h6" gutterBottom>Sentiment Distribution</Typography>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count">
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.name === "Positive" ? "#4caf50" : "#f44336"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Table */}
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
                      <Chip
                        label={r.label}
                        color={r.label === "Positive" ? "success" : "error"}
                        size="small"
                      />
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
