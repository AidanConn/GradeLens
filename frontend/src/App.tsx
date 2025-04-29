import { useEffect, useRef, useState } from 'react';
import { CssBaseline, AppBar, Toolbar, Typography,
  Container, Paper, Box, Tabs, Tab,
  Button, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions,
  Snackbar, Alert
} from '@mui/material';
import { FileUpload } from './components/FileUpload';
import { RunFilesList } from './components/RunFilesList';

export default function App() {
  const [sessionId, setSessionId] = useState<string|null>(null);
  const [tab, setTab] = useState(0);
  const didFetch = useRef(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [successSnackbarOpen, setSuccessSnackbarOpen] = useState(false);

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

  // clears localStorage, fetches a fresh session, and logs it
  const resetSession = () => {
    localStorage.removeItem("session_id");
    fetch(`${import.meta.env.VITE_API_URL}/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setSessionId(data.session_id);
        localStorage.setItem("session_id", data.session_id);
        console.log('Session reset. New ID:', data.session_id);
        setSuccessSnackbarOpen(true);
        setTab(0); // Go back to the upload tab after reset
      })
      .catch(err => console.error('Error resetting session', err));
  };

  // intercept tab clicks: value 2 triggers dialog, otherwise select Upload/Runs
  const handleTabChange = (_: unknown, newValue: number) => {
    if (newValue === 2) {
      setOpenConfirmDialog(true);
    } else {
      setTab(newValue);
    }
  };

  const handleConfirmReset = () => {
    setOpenConfirmDialog(false);
    resetSession();
  };
  const handleCancelReset = () => {
    setOpenConfirmDialog(false);
  };

  const handleSnackbarClose = () => {
    setSuccessSnackbarOpen(false);
  };

  return (
    <>
      <CssBaseline />
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            GradeLens Dashboard
          </Typography>
          <Tabs
            value={tab}
            onChange={handleTabChange}
            textColor="inherit"
            indicatorColor="secondary"
            sx={{ ml: 2 }}
          >
            <Tab label="Upload" sx={{ textTransform: 'none', color: 'common.white' }} />
            <Tab label="Runs"   sx={{ textTransform: 'none', color: 'common.white' }} />
            <Tab
              label="Reset Session"
              value={2}
              sx={{ textTransform: 'none', color: 'common.white', ml: 'auto' }}
            />
          </Tabs>
        </Toolbar>
      </AppBar>

      <Container
        maxWidth="md" // Changed from "sm" to "md" for a wider layout
        disableGutters
        sx={{
          mt: 4,
          mb: 4,
          minHeight: 'calc(100vh - 128px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        {tab === 0 && (
          <Paper
            sx={{
              p: 3,
              width: '100%',
              maxWidth: 900, // Increased maxWidth for the Paper
              mx: 'auto',
              boxSizing: 'border-box',
              overflow: 'visible',
            }}
          >
            <FileUpload
              sessionId={sessionId}
              onGoToRuns={() => setTab(1)}
            />
          </Paper>
        )}
        {tab === 1 && (
          <Paper sx={{ p: 3, height: '100%', overflow: 'auto' }}>
            <RunFilesList sessionId={sessionId} />
          </Paper>
        )}
      </Container>
      {/* Footer */}
      <Box component="footer" sx={{
        mt: 4,
        py: 3,
        px: 2,
        backgroundColor: 'primary.main',
        color: 'primary.contrastText'
      }}>
        <Container maxWidth="md" sx={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <Typography variant="body2">
            © {new Date().getFullYear()} GradeLens. All rights reserved.
          </Typography>
          <Typography variant="body2">
            Developed by CALM Byte
          </Typography>
        </Container>
      </Box>

      {/* Confirm Reset Dialog */}
      <Dialog
        open={openConfirmDialog}
        onClose={handleCancelReset}
      >
        <DialogTitle>Confirm Session Reset</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to reset the session? This will clear all session data.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelReset}>Cancel</Button>
          <Button onClick={handleConfirmReset} color="error">Reset</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={successSnackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          sx={{ width: '100%' }}
        >
          Session has been reset successfully.
        </Alert>
      </Snackbar>
    </>
  );
}
