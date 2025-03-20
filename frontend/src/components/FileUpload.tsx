import { useState } from 'react';
import { Box, Button, Alert, Input, Typography, Divider } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface FileUploadProps {
  sessionId: string | null;
}

export function FileUpload({ sessionId }: FileUploadProps) {
  const [commonFiles, setCommonFiles] = useState<FileList | null>(null);
  const [runFile, setRunFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleCommonFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setCommonFiles(event.target.files);
    }
  };

  const handleRunFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setRunFile(event.target.files[0]);
    }
  };

  const uploadCommonFiles = async () => {
    if (!commonFiles || commonFiles.length === 0) return;
    const formData = new FormData();
    Array.from(commonFiles).forEach(file => {
      formData.append('files', file); // Use "files" as the key to match the backend
    });
  
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload_sec_grp/`, {
        method: 'POST',
        credentials: 'include',
        headers: sessionId ? { 'X-Session-ID': sessionId } : {},
        body: formData
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();
      // Assuming the backend returns an array of file results:
      setMessage(
        `Files uploaded successfully: ${data.files
          .map((f: { original_filename: string }) => f.original_filename)
          .join(', ')}`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
  };  
  
  const uploadRunFile = async () => {
    if (!runFile) return;
    const formData = new FormData();
    formData.append('run_file', runFile);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload_run/`, {
        method: 'POST',
        credentials: 'include',
        headers: sessionId ? { 'X-Session-ID': sessionId } : {},
        body: formData
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();
      setMessage(`Run file uploaded. Run ID: ${data.run_id}. Calculation results: ${JSON.stringify(data.calculation_results)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Upload Common Files (.sec, .grp, .lst)
      </Typography>
      <Input type="file" inputProps={{ multiple: true, accept: '.sec,.grp,.lst' }} onChange={handleCommonFilesChange} />
      <Box sx={{ mt: 2, mb: 3 }}>
        <Button variant="contained" color="primary" startIcon={<CloudUploadIcon />} onClick={uploadCommonFiles}>
          Upload Common Files
        </Button>
      </Box>
      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" gutterBottom>
        Upload Run File (.run)
      </Typography>
      <Input type="file" inputProps={{ accept: '.run' }} onChange={handleRunFileChange} />
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" color="primary" startIcon={<CloudUploadIcon />} onClick={uploadRunFile}>
          Upload Run File
        </Button>
      </Box>
      {message && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="info">{message}</Alert>
        </Box>
      )}
    </Box>
  );
}