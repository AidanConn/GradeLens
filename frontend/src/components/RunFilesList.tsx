import React, { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemButton, ListItemText, Alert, Collapse } from '@mui/material';

interface RunFilesListProps {
  sessionId: string | null;
}

export const RunFilesList: React.FC<RunFilesListProps> = ({ sessionId }) => {
  const [runIds, setRunIds] = useState<string[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [calcDetails, setCalcDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch runs when sessionId is available
    if (!sessionId) return;
    const fetchRuns = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/runs/`, {
          credentials: 'include',
          headers: { 'X-Session-ID': sessionId }
        });
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        setRunIds(data.runs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      }
    };
    fetchRuns();
  }, [sessionId]);

  const handleSelect = async (runId: string) => {
    if (!sessionId) return;
    setSelectedRun(runId);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/runs/${runId}/calculations`, {
        credentials: 'include',
        headers: { 'X-Session-ID': sessionId }
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      setCalcDetails(data.calculations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch calculation details.');
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Run History
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {runIds.length === 0 ? (
        <Typography>No runs found.</Typography>
      ) : (
        <List>
          {runIds.map((runId) => (
            <ListItem key={runId}>
              <ListItemButton onClick={() => handleSelect(runId)}>
                <ListItemText primary={`Run ID: ${runId}`} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
      <Collapse in={!!selectedRun}>
        {selectedRun && calcDetails && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Calculations for Run {selectedRun}:</Typography>
            <pre>{JSON.stringify(calcDetails, null, 2)}</pre>
          </Box>
        )}
      </Collapse>
    </Box>
  );
};