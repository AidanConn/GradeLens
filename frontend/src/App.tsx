import React, { useEffect, useRef, useState } from 'react';
import {
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  Grid,
  Paper
} from '@mui/material';
import { FileUpload } from './components/FileUpload';
import { RunFilesList } from './components/RunFilesList';

const App: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    // Check if a session id is already stored in localStorage
    const storedSession = localStorage.getItem("session_id");
    if (storedSession) {
      setSessionId(storedSession);
    } else {
      // Call the root endpoint to warm up and set the cookie.
      fetch(`${import.meta.env.VITE_API_URL}/`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          console.log('Session initialized with ID:', data.session_id);
          setSessionId(data.session_id);
          localStorage.setItem("session_id", data.session_id);
        })
        .catch((err) => {
          console.error('Error initializing session', err);
        });
    }
  }, []);

  return (
    <>
      <CssBaseline />
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6">GradeLens Dashboard</Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Toolbar />
        <Container maxWidth="md">
          <Typography variant="body1" sx={{ mb: 2 }}>
            Session ID: {sessionId || "Loading..."}
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <FileUpload sessionId={sessionId} />
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <RunFilesList sessionId={sessionId} />
              </Paper>
            </Grid>
          </Grid>
        </Container>
        <Box sx={{ textAlign: 'center', p: 2 }}>
          <Typography variant="body2" color="textSecondary">
            © {new Date().getFullYear()} GradeLens. All rights reserved. Developed by CALM Byte
          </Typography>
        </Box>
      </Box>
    </>
  );
};

export default App;