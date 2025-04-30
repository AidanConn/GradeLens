import { useState, ChangeEvent } from 'react';
import { Box, Button, Alert, Input, Typography, Divider, Paper, Stepper, Step, StepLabel, StepContent, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface FileUploadProps {
  sessionId: string | null;
  onGoToRuns: () => void;
}

/**
 * FileUpload Component
 * 
 * Provides a guided interface for uploading files required by the GradeLens application.
 * Implements a step-by-step workflow:
 * 1. Upload section (.sec) and group (.grp) files
 * 2. Upload run (.run) file for analysis configuration
 * 3. Guide users to view and calculate results
 * 
 * The component handles file validation, upload status tracking, and error management.
 * It also provides feedback to users through success/error messages and visual indicators.
 * 
 */
export function FileUpload({ sessionId, onGoToRuns }: FileUploadProps) {
  // Existing state variables
  const [commonFiles, setCommonFiles] = useState<FileList | null>(null);
  const [runFile, setRunFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedCommonFiles, setUploadedCommonFiles] = useState(false);
  const [uploadedRunFile, setUploadedRunFile] = useState(false);

  // Existing handlers for file changes and uploads
  const handleCommonFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setCommonFiles(event.target.files);
      setUploadedCommonFiles(false); // Reset uploaded state when new files are selected
      setError(null);
    }
  };

  const handleRunFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setRunFile(event.target.files[0]);
      setUploadedRunFile(false); // Reset uploaded state when new file is selected
      setError(null);
    }
  };

  const uploadCommonFiles = async () => {
    if (!commonFiles || commonFiles.length === 0) {
      setError("Please select at least one .sec or .grp file");
      return;
    }
    
    setLoading(true);
    setError(null);
    const formData = new FormData();
    Array.from(commonFiles).forEach(file => {
      formData.append('files', file);
    });
  
    // This triggers the upload to the server
    // The server will handle the files and return a response
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload_sec_grp/`, {
        method: 'POST',
        credentials: 'include',
        headers: sessionId ? { 'X-Session-ID': sessionId } : {},
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      setMessage(
        `Files uploaded successfully: ${data.files
          .map((f: { original_filename: string }) => f.original_filename)
          .join(', ')}`
      );
      
      setUploadedCommonFiles(true);
      // Only advance to next step if files were actually uploaded
      setActiveStep(1);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };  
  
  const uploadRunFile = async () => {
    if (!runFile) {
      setError("Please select a .run file");
      return;
    }
    
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('run_file', runFile);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload_run/`, {
        method: 'POST',
        credentials: 'include',
        headers: sessionId ? { 'X-Session-ID': sessionId } : {},
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      setMessage(`Run file "${runFile.name}" uploaded successfully. Run ID: ${data.run_id}`);
      setUploadedRunFile(true);
      // Only advance to next step if file was actually uploaded
      setActiveStep(2);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Render the component
  // The component provides a step-by-step guide for users to upload files and calculate results
  return (
    <Box sx={{ mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom color="primary">
          How to Use GradeLens
        </Typography>
        
        <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 2 }}>
          <Step>
            <StepLabel 
              StepIconProps={{
                icon: uploadedCommonFiles ? <CheckCircleIcon color="success" /> : 1
              }}
            >
              Upload Section and Group Files
            </StepLabel>
            <StepContent>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                First, upload all your .sec and .grp files. These contain your course sections and student groups.
                You only need to upload these files once unless they change.
              </Typography>
              <Input 
                type="file" 
                inputProps={{ multiple: true, accept: '.sec,.grp' }} 
                onChange={handleCommonFilesChange} 
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={loading && activeStep === 0 ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />} 
                  onClick={uploadCommonFiles}
                  disabled={!commonFiles || commonFiles.length === 0 || (loading && activeStep === 0)}
                >
                  {loading && activeStep === 0 ? 'Uploading...' : 'Upload Files'}
                </Button>
                {uploadedCommonFiles && (
                  <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} /> Files uploaded successfully
                  </Typography>
                )}
              </Box>
              {!uploadedCommonFiles && (
                <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                  You must upload files before proceeding
                </Typography>
              )}
            </StepContent>
          </Step>
          
          <Step>
            <StepLabel 
              StepIconProps={{
                icon: uploadedRunFile ? <CheckCircleIcon color="success" /> : 2
              }}
            >
              Upload Run File
            </StepLabel>
            <StepContent>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Next, upload a .run file. This specifies which courses to include in your analysis.
                You can create multiple run files for different analyses.
              </Typography>
              <Input 
                type="file" 
                inputProps={{ accept: '.run' }} 
                onChange={handleRunFileChange} 
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={loading && activeStep === 1 ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />} 
                  onClick={uploadRunFile}
                  disabled={!runFile || (loading && activeStep === 1)}
                >
                  {loading && activeStep === 1 ? 'Uploading...' : 'Upload Run File'}
                </Button>
                {uploadedRunFile && (
                  <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} /> Run file uploaded successfully
                  </Typography>
                )}
              </Box>
              {!uploadedRunFile && (
                <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                  You must upload a run file before proceeding
                </Typography>
              )}
            </StepContent>
          </Step>
          
          <Step>
            <StepLabel>Calculate Results</StepLabel>
            <StepContent>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Once your files are uploaded, go to the "Runs" tab to see your run.
                Click on it and select "Calculate Results" to generate your analysis.
                You'll be able to view reports, visualize data, and export to Excel.
              </Typography>
              <Button 
                variant="contained"
                color="primary"
                onClick={onGoToRuns}
              >
                Go to Runs
              </Button>
            </StepContent>
          </Step>
        </Stepper>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {message && !error && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', p: 2, bgcolor: 'info.light', color: 'info.contrastText', borderRadius: 1 }}>
        <InfoOutlinedIcon sx={{ mr: 1 }} />
        <Typography variant="body2">
          Files remain associated with your session. You can upload multiple sets of files and create different analyses.
        </Typography>
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      <Typography variant="h6" gutterBottom>
        Advanced Upload Options
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Upload Section & Group Files (.sec, .grp)
          </Typography>
          <Input type="file" inputProps={{ multiple: true, accept: '.sec,.grp' }} onChange={handleCommonFilesChange} />
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button 
              variant="contained" 
              size="small" 
              color="primary" 
              startIcon={loading && activeStep === 0 ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />} 
              onClick={uploadCommonFiles}
              disabled={!commonFiles || commonFiles.length === 0 || (loading && activeStep === 0)}
            >
              {loading && activeStep === 0 ? 'Uploading...' : 'Upload Files'}
            </Button>
            {uploadedCommonFiles && (
              <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} /> Files uploaded
              </Typography>
            )}
          </Box>
        </Box>
        
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Upload Run File (.run)
          </Typography>
          <Input type="file" inputProps={{ accept: '.run' }} onChange={handleRunFileChange} />
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button 
              variant="contained" 
              size="small" 
              color="primary" 
              startIcon={loading && activeStep === 1 ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
              onClick={uploadRunFile}
              disabled={!runFile || (loading && activeStep === 1)}
            >
              {loading && activeStep === 1 ? 'Uploading...' : 'Upload Run File'}
            </Button>
            {uploadedRunFile && (
              <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} /> File uploaded
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}