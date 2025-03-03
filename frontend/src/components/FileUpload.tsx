// language: ts
import { useState } from 'react';

export function FileUpload() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(event.target.files);
    }
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/mass_upload/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      setMessage(
        `Upload successful: ${data.map((item: any) => item.filename).join(', ')}`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  return (
    <div>
      <input
        type="file"
        multiple
        accept=".run,.grp,.sec,.lst"
        onChange={handleFileChange}
      />
      <button onClick={handleUpload}>Upload All</button>
      {message && <p>{message}</p>}
    </div>
  );
}