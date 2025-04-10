import React, { useState, useEffect } from 'react';
import {
  Box, Typography, List, ListItem, ListItemButton, ListItemText,
  Alert, Collapse, Button, Tabs, Tab, TextField, InputAdornment
} from '@mui/material';
import { DataVisualization } from './DataVisualization';
import { EnhancedDataDisplay } from './EnhancedDataDisplay';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

interface Run {
  run_id: string;
  run_name: string;
  associated_files: string[];
  calculations_exist: boolean;
  created_at: string;
}

interface RunFilesListProps {
  sessionId: string | null;
}

export const RunFilesList: React.FC<RunFilesListProps> = ({ sessionId }) => {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [calcDetails, setCalcDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRuns = async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/runs/`, {
        credentials: 'include',
        headers: { 'X-Session-ID': sessionId }
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      setRuns(data.runs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();

    // Add an event listener for the refresh event
    const handleRefreshEvent = () => {
      if (sessionId) {
        fetchRuns();
      }
    };
    
    window.addEventListener('refresh-runs', handleRefreshEvent);
    
    // Cleanup function
    return () => {
      window.removeEventListener('refresh-runs', handleRefreshEvent);
    };
  }, [sessionId]); // Make sure to include sessionId in the dependency array

  const handleSelect = async (runId: string) => {
    if (!sessionId) return;
    setSelectedRun(runId);

    try {
      setLoading(true);
      const statusResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/runs/${runId}/status`, {
        credentials: 'include',
        headers: { 'X-Session-ID': sessionId }
      });

      if (!statusResponse.ok) {
        throw new Error(`Error: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();

      if (statusData.calculations_exist) {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/runs/${runId}/calculations`, {
          credentials: 'include',
          headers: { 'X-Session-ID': sessionId }
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        setCalcDetails(data.calculations);
      } else {
        setCalcDetails(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch run details.');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async (runId: string) => {
    if (!sessionId) return;

    try {
      setExporting(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/runs/${runId}/export`, {
        credentials: 'include',
        headers: { 'X-Session-ID': sessionId }
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      // Get filename from Content-Disposition header or use default name
      let filename = 'GradeLens_Report.xlsx';
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Handle the response as a blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export run data to Excel.');
    } finally {
      setExporting(false);
    }
  };

  const calculateRun = async (runId: string) => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/runs/${runId}/calculate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Session-ID': sessionId,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setCalcDetails(data.calculation_results);
      fetchRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate run.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Run History
      </Typography>
      {loading && <Typography>Loading...</Typography>}
      {error && <Alert severity="error">{error}</Alert>}
      {runs.length === 0 ? (
        <Typography>No runs found.</Typography>
      ) : (
        <List>
          {runs.map((run) => (
            <ListItem key={run.run_id}>
              <ListItemButton onClick={() => handleSelect(run.run_id)}>
                <ListItemText
                  primary={`${run.run_name || 'Unnamed Run'} (${run.run_id})`}
                  secondary={`Created: ${new Date(run.created_at).toLocaleString()} | Files: ${run.associated_files?.join(', ') || 'None'}`}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
      <Collapse in={!!selectedRun}>
        {selectedRun && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              border: '1px solid #ccc',
              borderRadius: 1,
              width: '100%', // Full width
              maxWidth: '1200px', // Optional: Limit max width
              margin: '0 auto' // Center horizontally
            }}
          >
            <Typography variant="subtitle1" gutterBottom>
              Selected Run: {runs.find(r => r.run_id === selectedRun)?.run_name || selectedRun}
            </Typography>

            {calcDetails && (
              <Button
                variant="outlined"
                color="primary"
                startIcon={<FileDownloadIcon />}
                onClick={() => exportToExcel(selectedRun)}
                disabled={exporting}
                size="small"
              >
                {exporting ? 'Exporting...' : 'Export to Excel'}
              </Button>
            )}


            {!calcDetails && runs.find(r => r.run_id === selectedRun)?.calculations_exist === false && (
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => calculateRun(selectedRun)}
                  disabled={loading}
                >
                  Calculate Results
                </Button>
              </Box>
            )}

            {calcDetails ? (
              <Box>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                  <Tab label="Summary" />
                  <Tab label="Course Details" />
                  <Tab label="Sections" />
                  <Tab label="Students" />
                  {/*<Tab label="Raw JSON" />*/}
                </Tabs>

                {activeTab === 0 && (
                  <Box>
                    <EnhancedDataDisplay
                      data={calcDetails}
                      displayType="summary"
                    />
                  </Box>
                )}

                {activeTab === 1 && (
                  <Box>
                    <EnhancedDataDisplay
                      data={calcDetails}
                      displayType="courses"
                    />
                  </Box>
                )}

                {activeTab === 2 && (
                  <Box>
                    <EnhancedDataDisplay
                      data={calcDetails}
                      displayType="sections"
                    />
                  </Box>
                )}

                {activeTab === 3 && (
                  <Box>
                    <TextField
                      fullWidth
                      variant="outlined"
                      margin="normal"
                      placeholder="Search by name, ID, or grade..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ mb: 2 }}
                    />
                    <EnhancedDataDisplay
                      data={calcDetails}
                      displayType="students"
                      searchTerm={searchTerm}
                    />
                  </Box>
                )}

                {activeTab === 4 && (
                  <Box>
                    <Typography variant="subtitle2">Raw Calculation Results:</Typography>
                    <pre style={{ overflowX: 'auto', padding: '8px', backgroundColor: '#f5f5f5', fontSize: '0.8rem' }}>
                      {JSON.stringify(calcDetails, null, 2)}
                    </pre>
                  </Box>
                )}

                {calcDetails.courses && activeTab < 4 && (
                  <Box mt={4}>
                    <DataVisualization data={calcDetails} />
                  </Box>
                )}
              </Box>
            ) : (
              <Typography>
                {runs.find(r => r.run_id === selectedRun)?.calculations_exist
                  ? 'Loading calculations...'
                  : 'No calculations exist for this run yet. Click "Calculate Results" to process this run.'}
              </Typography>
            )}
          </Box>
        )}
      </Collapse>
    </Box>
  );
};