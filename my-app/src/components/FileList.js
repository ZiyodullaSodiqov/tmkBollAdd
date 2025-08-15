import React, { useState, useEffect } from 'react';
import axios from 'axios';

function FileList() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/files');
      setFiles(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch files');
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await axios.delete(`http://localhost:3001/api/files/${id}`);
        setFiles(files.filter(file => file._id !== id));
      } catch (err) {
        setError('Failed to delete file');
      }
    }
  };

  if (loading) return <div className="text-center">Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <h2>Files</h2>
      <table className="table table-striped">
        <thead>
          <tr>
            <th>File ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>User ID</th>
            <th>Selected ID</th>
            <th>Shift</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map(file => (
            <tr key={file._id}>
              <td>{file.fileId}</td>
              <td>{file.originalName}</td>
              <td>{file.fileType}</td>
              <td>{file.userId}</td>
              <td>{file.userSelectedId}</td>
              <td>{file.shift}</td>
              <td>{file.status}</td>
              <td>
                <a href={`http://localhost:3001/api/files/${file._id}/download`} className="btn btn-sm btn-primary me-2">Download</a>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(file._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FileList;