import React, { useState } from "react";
import {
  Container, Typography, Box, Tabs, Tab, AppBar, Toolbar,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import PsychologyIcon from "@mui/icons-material/Psychology";
import SingleAnalysis from "./components/SingleAnalysis";
import BatchAnalysis from "./components/BatchAnalysis";

const theme = createTheme({
  palette: {
    primary: { main: "#1976d2" },
    background: { default: "#f5f5f5" },
  },
});

export default function App() {
  const [tab, setTab] = useState(0);

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        {/* Header */}
        <AppBar position="static">
          <Toolbar>
            <PsychologyIcon sx={{ mr: 1 }} />
            <Typography variant="h6" fontWeight="bold">
              Sentiment Analysis Dashboard
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Analyze text sentiment using TF-IDF + Logistic Regression
          </Typography>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Single Analysis" />
              <Tab label="Batch Analysis" />
            </Tabs>
          </Box>

          {/* Tab Panels */}
          <Box sx={{ bgcolor: "white", p: 3, borderRadius: 2, boxShadow: 1 }}>
            {tab === 0 && <SingleAnalysis />}
            {tab === 1 && <BatchAnalysis />}
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
