import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, List, ListItem, ListItemButton, ListItemText, 
  Alert, Collapse, Button 
} from '@mui/material';

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
    // Only fetch runs when sessionId is available
    fetchRuns();
  }, [sessionId]);

  const handleSelect = async (runId: string) => {
    if (!sessionId) return;
    setSelectedRun(runId);
    
    try {
      setLoading(true);
      // First check if calculations exist 
      const statusResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/runs/${runId}/status`, {
        credentials: 'include',
        headers: { 'X-Session-ID': sessionId }
      });
      
      if (!statusResponse.ok) {
        throw new Error(`Error: ${statusResponse.status}`);
      }
      
      const statusData = await statusResponse.json();
      
      if (statusData.calculations_exist) {
        // If calculations exist, fetch them
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
      // Refresh the runs list to update calculation status
      fetchRuns(); 
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate run.');
    } finally {
      setLoading(false);
    }
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
          <Box sx={{ mt: 2, p: 2, border: '1px solid #ccc', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Selected Run: {runs.find(r => r.run_id === selectedRun)?.run_name || selectedRun}
            </Typography>
            
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
                <Typography variant="subtitle2">Calculation Results:</Typography>
                <pre style={{ overflowX: 'auto', padding: '8px', backgroundColor: '#f5f5f5' }}>
                  {JSON.stringify(calcDetails, null, 2)}
                </pre>
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