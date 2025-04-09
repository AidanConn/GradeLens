import React, { useEffect, useRef, useState } from 'react';
import {
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
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
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="fixed">
          <Toolbar>
            <Typography variant="h6">GradeLens Dashboard</Typography>
          </Toolbar>
        </AppBar>
        <Toolbar />
        <Container disableGutters maxWidth={false} sx={{ flex: 1, overflowY: 'auto', pb: 3 }}>
          {/* Welcome Message */}
          <Typography 
            variant="h4" 
            sx={{ textAlign: 'center', mt: 2, mb: 4, fontWeight: 'bold', color: '#646cff' }}
          >
            Welcome to GradeLens!
          </Typography>

          <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
            Session ID: {sessionId || "Loading..."}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              minHeight: '400px',
              mt: 2,
            }}
          >
            <Paper id="upload-section" sx={{ p: 3, width: '100%', maxWidth: 500 }}>
              <FileUpload sessionId={sessionId} />
            </Paper>

            <Paper id="runs-section" sx={{ p: 3, width: '100%' }} data-testid="runs-list">
              <RunFilesList sessionId={sessionId} />
            </Paper>
          </Box>
        </Container>
        <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f5f5f5', width: '100%' }}>
          <Typography variant="body2" color="textSecondary">
            © {new Date().getFullYear()} GradeLens. All rights reserved. Developed by CALM Byte
          </Typography>
        </Box>
      </Box>
    </>
  );
};

export default App;
