import React, { useState } from "react";
import { Box, Container, Tabs, Tab, Typography } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Header from "./components/Header";
import SingleAnalysisPage from "./pages/SingleAnalysisPage";
import BatchAnalysisPage from "./pages/BatchAnalysisPage";

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
        <Header />
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Analyze text sentiment using TF-IDF + Logistic Regression
          </Typography>
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Single Analysis" />
              <Tab label="Batch Analysis" />
            </Tabs>
          </Box>
          <Box sx={{ bgcolor: "white", p: 3, borderRadius: 2, boxShadow: 1 }}>
            {tab === 0 && <SingleAnalysisPage />}
            {tab === 1 && <BatchAnalysisPage />}
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
