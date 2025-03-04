import { useState, useEffect } from 'react';

export function RunFilesList() {
  const [runFiles, setRunFiles] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const fetchRunFiles = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/run_files/`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        setRunFiles(data.run_files);
      } catch (error) {
        console.error('Error fetching run files', error);
      }
    };

    fetchRunFiles();
  }, []);

  const handleSelect = (filename: string) => {
    setSelected(filename);
    // Further execution logic can be added here.
  };

  return (
    <div>
      <h2>Primary .run Files</h2>
      {runFiles.length === 0 ? (
        <p>No .run files found.</p>
      ) : (
        <ul>
          {runFiles.map((file) => (
            <li key={file}>
              <button onClick={() => handleSelect(file)}>{file}</button>
            </li>
          ))}
        </ul>
      )}
      {selected && <p>Selected file: {selected}</p>}
    </div>
  );
}