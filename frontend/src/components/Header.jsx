import React from "react";
import { AppBar, Toolbar, Typography } from "@mui/material";
import PsychologyIcon from "@mui/icons-material/Psychology";

export default function Header() {
  return (
    <AppBar position="static">
      <Toolbar>
        <PsychologyIcon sx={{ mr: 1 }} />
        <Typography variant="h6" fontWeight="bold">
          Sentiment Analysis Dashboard
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
