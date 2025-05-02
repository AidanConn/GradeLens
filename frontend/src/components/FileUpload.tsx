import { useState, ChangeEvent } from 'react';
import { Box, Button, Alert, Input, Typography, Paper, Stepper, Step, StepLabel, StepContent, CircularProgress, LinearProgress, Fade } from '@mui/material';
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
  const [commonFiles, setCommonFiles] = useState<FileList | null>(null);
  const [runFile, setRunFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedCommonFiles, setUploadedCommonFiles] = useState(false);
  const [uploadedRunFile, setUploadedRunFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleCommonFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setCommonFiles(event.target.files);
      setUploadedCommonFiles(false);
      setError(null);
    }
  };

  const handleRunFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setRunFile(event.target.files[0]);
      setUploadedRunFile(false);
      setError(null);
    }
  };

  // Utility to check if all selected files were uploaded successfully
  function allFilesUploaded(selectedFiles: FileList | null, uploadedFiles: string[]): { all: boolean, missing: string[] } {
    if (!selectedFiles) return { all: true, missing: [] };
    const selectedNames = Array.from(selectedFiles).map(f => f.name);
    const missing = selectedNames.filter(name => !uploadedFiles.includes(name));
    return { all: missing.length === 0, missing };
  }

  const uploadCommonFiles = async () => {
    if (!commonFiles || commonFiles.length === 0) {
      setError("Please select at least one .sec or .grp file");
      return;
    }
    
    setUploadProgress(0);
    setLoading(true);
    setError(null);
    const formData = new FormData();
    Array.from(commonFiles).forEach(file => {
      formData.append('files', file);
    });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${import.meta.env.VITE_API_URL}/api/upload_sec_grp/`);
    if (sessionId) xhr.setRequestHeader('X-Session-ID', sessionId);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = async () => {
      setLoading(false);
      setUploadProgress(100);
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        const uploadedNames = data.files.map((f: { original_filename: string }) => f.original_filename);
        const check = allFilesUploaded(commonFiles, uploadedNames);
        if (check.all) {
          setMessage("All selected files were uploaded successfully!");
        } else {
          setMessage(
            `The following files were not uploaded: ${check.missing.join(', ')}`
          );
        }
        setUploadedCommonFiles(true);
        setActiveStep(1);

        const selectedFiles = Array.from(commonFiles).map(f => f.name); // Files user selected
        const missing = selectedFiles.filter(name => !uploadedNames.includes(name));
        if (missing.length === 0) {
          console.log("All selected files were uploaded successfully!");
        } else {
          console.log("The following files were not uploaded:", missing.join(', '));
        }
      } else {
        setError(`Error ${xhr.status}: ${xhr.responseText}`);
      }
    };
    xhr.onerror = () => {
      setLoading(false);
      setError('Upload failed');
    };
    xhr.send(formData);
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
      setActiveStep(2);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mb: 4, maxWidth: 600, mx: 'auto', minHeight: 600 }}>
      <Paper elevation={6} sx={{ p: 4, mb: 4, borderRadius: 4, boxShadow: 6, background: 'linear-gradient(135deg, #e3f2fd 0%, #fff 100%)', minHeight: 500, overflowY: 'auto' }}>
        <Typography variant="h4" gutterBottom color="primary" fontWeight="bold" sx={{ letterSpacing: 1 }}>
          <CloudUploadIcon sx={{ mr: 1, fontSize: 36, verticalAlign: 'middle' }} /> GradeLens File Upload
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3, color: 'text.secondary' }}>
          Upload your section, group, and run files to get started with your analysis. Follow the steps below!
        </Typography>
        <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 3, background: 'transparent' }}>
          <Step>
            <StepLabel 
              StepIconProps={{
                icon: uploadedCommonFiles ? <CheckCircleIcon color="success" /> : 1
              }}
            >
              <Typography fontWeight="bold">Upload Section and Group Files</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                First, upload all your <b>.sec</b> and <b>.grp</b> files. These contain your course sections and student groups.<br />
                <span style={{ color: '#1976d2' }}>You only need to upload these files once unless they change.</span>
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 2,
                  bgcolor: '#f5faff',
                  borderRadius: 2,
                  border: '1px solid #90caf9',
                  transition: 'background 0.3s, border 0.3s',
                }}
              >
                <label htmlFor="common-files-upload">
                  <Input 
                    id="common-files-upload"
                    type="file" 
                    inputProps={{ multiple: true, accept: '.sec,.grp' }} 
                    onChange={handleCommonFilesChange} 
                    sx={{ display: 'none' }}
                  />
                  <Button
                    variant="contained"
                    component="span"
                    color="primary"
                    startIcon={<CloudUploadIcon />}
                    sx={{ borderRadius: 2, fontWeight: 'bold', px: 3, mb: 0, boxShadow: 2, textTransform: 'none', fontSize: 16 }}
                  >
                    Browse Section/Group Files
                  </Button>
                  {commonFiles && commonFiles.length > 0 && (
                    <Box sx={{ ml: 0, mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {Array.from(commonFiles).map(f => (
                        <Box key={f.name} sx={{
                          px: 1.5, py: 0.5, borderRadius: 2, bgcolor: '#e3f2fd', color: '#1976d2', fontWeight: 500, fontSize: 14, boxShadow: 1, display: 'flex', alignItems: 'center', gap: 1
                        }}>
                          <CloudUploadIcon sx={{ fontSize: 18, mr: 0.5 }} />
                          {f.name}
                        </Box>
                      ))}
                    </Box>
                  )}
                </label>
                <Box sx={{ mt: 2, mb: 1 }}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={loading && activeStep === 0 ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />} 
                    onClick={uploadCommonFiles}
                    disabled={!commonFiles || commonFiles.length === 0 || (loading && activeStep === 0)}
                    sx={{ borderRadius: 2, fontWeight: 'bold', px: 3, boxShadow: 2, textTransform: 'none', fontSize: 16 }}
                  >
                    {loading && activeStep === 0 ? 'Uploading...' : 'Upload Files'}
                  </Button>
                </Box>
                {loading && <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 2 }} />}
                <Fade in={uploadedCommonFiles}>
                  <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} /> Files uploaded successfully
                  </Typography>
                </Fade>
                {!uploadedCommonFiles && (
                  <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                    You must upload files before proceeding
                  </Typography>
                )}
              </Paper>
            </StepContent>
          </Step>
          <Step>
            <StepLabel 
              StepIconProps={{
                icon: uploadedRunFile ? <CheckCircleIcon color="success" /> : 2
              }}
            >
              <Typography fontWeight="bold">Upload Run File</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Next, upload a <b>.run</b> file. This specifies which courses to include in your analysis.<br />
                <span style={{ color: '#1976d2' }}>You can create multiple run files for different analyses.</span>
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f5faff', borderRadius: 2 }}>
                <label htmlFor="run-file-upload">
                  <Input 
                    id="run-file-upload"
                    type="file" 
                    inputProps={{ accept: '.run' }} 
                    onChange={handleRunFileChange} 
                    sx={{ display: 'none' }}
                  />
                  <Button
                    variant="contained"
                    component="span"
                    color="primary"
                    startIcon={<CloudUploadIcon />}
                    sx={{ borderRadius: 2, fontWeight: 'bold', px: 3, mb: 0, boxShadow: 2, textTransform: 'none', fontSize: 16 }}
                  >
                    Browse Run File
                  </Button>
                  {runFile && (
                    <Box sx={{ ml: 0, mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{
                        px: 1.5, py: 0.5, borderRadius: 2, bgcolor: '#e3f2fd', color: '#1976d2', fontWeight: 500, fontSize: 14, boxShadow: 1, display: 'flex', alignItems: 'center', gap: 1
                      }}>
                        <CloudUploadIcon sx={{ fontSize: 18, mr: 0.5 }} />
                        {runFile.name}
                      </Box>
                    </Box>
                  )}
                </label>
                <Box sx={{ mt: 2, mb: 1 }}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={loading && activeStep === 1 ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />} 
                    onClick={uploadRunFile}
                    disabled={!runFile || (loading && activeStep === 1)}
                    sx={{ borderRadius: 2, fontWeight: 'bold', px: 3, boxShadow: 2, textTransform: 'none', fontSize: 16 }}
                  >
                    {loading && activeStep === 1 ? 'Uploading...' : 'Upload Run File'}
                  </Button>
                </Box>
              </Paper>
            </StepContent>
          </Step>
          <Step>
            <StepLabel><Typography fontWeight="bold">Calculate Results</Typography></StepLabel>
            <StepContent>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Once your files are uploaded, go to the <b>Runs</b> tab to see your run.<br />
                Click on it and select <b>Calculate Results</b> to generate your analysis.<br />
                <span style={{ color: '#1976d2' }}>You'll be able to view reports, visualize data, and export to Excel.</span>
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={onGoToRuns}
                sx={{ borderRadius: 2, fontWeight: 'bold', px: 3, boxShadow: 2, textTransform: 'none', fontSize: 16 }}
              >
                Go to Runs
              </Button>
            </StepContent>
          </Step>
        </Stepper>
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
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', p: 2, bgcolor: '#e3f2fd', color: '#1976d2', borderRadius: 2, boxShadow: 0 }}>
          <InfoOutlinedIcon sx={{ mr: 1 }} />
          <Typography variant="body2">
            Files remain associated with your session. You can upload multiple sets of files and create different analyses.
          </Typography>
        </Box>
      </Paper>
      <Paper elevation={2} sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #f5faff 0%, #fff 100%)', mt: 4 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <InfoOutlinedIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">Advanced Upload Options</Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Use this section if you need to upload additional run files or update your section/group files after your initial upload. This is intended for advanced users or for updating your analysis without restarting your session.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Upload Section & Group Files (.sec, .grp)
            </Typography>
            <label htmlFor="common-files-upload-advanced">
              <Input 
                id="common-files-upload-advanced"
                type="file" 
                inputProps={{ multiple: true, accept: '.sec,.grp' }} 
                onChange={handleCommonFilesChange} 
                sx={{ display: 'none' }}
              />
              <Button
                variant="outlined"
                component="span"
                color="primary"
                startIcon={<CloudUploadIcon />}
                sx={{ borderRadius: 2, fontWeight: 'bold', px: 2, mb: 1, textTransform: 'none', fontSize: 15 }}
              >
                Browse Section/Group Files
              </Button>
              {commonFiles && commonFiles.length > 0 && (
                <Typography variant="caption" sx={{ ml: 2, display: 'inline', color: 'text.secondary' }}>
                  {Array.from(commonFiles).map(f => f.name).join(', ')}
                </Typography>
              )}
            </label>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button 
                variant="outlined" 
                size="small" 
                color="primary" 
                startIcon={<CloudUploadIcon />} 
                onClick={uploadCommonFiles}
                disabled={!commonFiles || commonFiles.length === 0 || (loading && activeStep === 0)}
                sx={{ borderRadius: 2, fontWeight: 'bold', px: 2, textTransform: 'none', fontSize: 15 }}
              >
                Upload Files
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
            <label htmlFor="run-file-upload-advanced">
              <Input 
                id="run-file-upload-advanced"
                type="file" 
                inputProps={{ accept: '.run' }} 
                onChange={handleRunFileChange} 
                sx={{ display: 'none' }}
              />
              <Button
                variant="outlined"
                component="span"
                color="primary"
                startIcon={<CloudUploadIcon />}
                sx={{ borderRadius: 2, fontWeight: 'bold', px: 2, mb: 1, textTransform: 'none', fontSize: 15 }}
              >
                Browse Run File
              </Button>
              {runFile && (
                <Box sx={{ ml: 0, mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{
                    px: 1.5, py: 0.5, borderRadius: 2, bgcolor: '#e3f2fd', color: '#1976d2', fontWeight: 500, fontSize: 14, boxShadow: 1, display: 'flex', alignItems: 'center', gap: 1
                  }}>
                    <CloudUploadIcon sx={{ fontSize: 18, mr: 0.5 }} />
                    {runFile.name}
                  </Box>
                </Box>
              )}
            </label>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button 
                variant="outlined" 
                size="small" 
                color="primary" 
                startIcon={<CloudUploadIcon />}
                onClick={uploadRunFile}
                disabled={!runFile || (loading && activeStep === 1)}
                sx={{ borderRadius: 2, fontWeight: 'bold', px: 2, textTransform: 'none', fontSize: 15 }}
              >
                Upload Run File
              </Button>
              {uploadedRunFile && (
                <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} /> File uploaded
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}