import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Spinner, Alert, Modal, Button, Form, Badge, Table, 
  Tabs, Tab, Row, Col, Card, Container 
} from 'react-bootstrap';
import { Bar, Line, Pie } from 'react-chartjs-2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
);

const AdminPanel = () => {
  // State for active tab and filters
  const [activeTab, setActiveTab] = useState('daily');
  const [date, setDate] = useState(new Date());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [shift, setShift] = useState('all');
  const [fileType, setFileType] = useState('all');
  
  // Data states
  const [dailyFiles, setDailyFiles] = useState([]);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [shiftStats, setShiftStats] = useState([]);
  const [idStats, setIdStats] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Fetch daily files with filters
  const fetchDailyFiles = async () => {
    try {
      setLoading(true);
      const formattedDate = date.toISOString().split('T')[0];
      const res = await axios.get('http://localhost:3001/api/files', {
        params: {
          date: formattedDate,
          shift: shift === 'all' ? null : shift,
          fileType: fileType === 'all' ? null : fileType
        }
      });
      setDailyFiles(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add this to your AdminPanel component
useEffect(() => {
  const pingInterval = setInterval(() => {
    axios.get('http://localhost:3001/api/ping')
      .then(() => console.log('Server pinged'))
      .catch(err => console.error('Ping failed:', err));
  }, 40000); 

  return () => clearInterval(pingInterval); // Cleanup on unmount
}, []);

  // Fetch shift statistics for the day
  const fetchShiftStats = async () => {
    try {
      const formattedDate = date.toISOString().split('T')[0];
      const res = await axios.get('http://localhost:3001/api/stats/daily', {
        params: { date: formattedDate }
      });
      setShiftStats(res.data);
    } catch (err) {
      console.error("Failed to fetch shift stats:", err);
    }
  };

  // Fetch ID statistics for the day
  const fetchIdStats = async () => {
    try {
      const formattedDate = date.toISOString().split('T')[0];
      const res = await axios.get('http://localhost:3001/api/stats/id', {
        params: { date: formattedDate }
      });
      setIdStats(res.data);
    } catch (err) {
      console.error("Failed to fetch ID stats:", err);
    }
  };

  // Fetch monthly reports by ID
  const fetchMonthlyReports = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:3001/api/reports/monthly', {
        params: {
          year,
          month,
          fileType: fileType === 'all' ? null : fileType
        }
      });
      setMonthlyReports(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch monthly trend data
  const fetchMonthlyTrend = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/stats/monthly', {
        params: { year }
      });
      setMonthlyTrend(res.data);
    } catch (err) {
      console.error("Failed to fetch monthly trend:", err);
    }
  };

  // Delete a file
  const deleteFile = async () => {
    try {
      await axios.delete(`http://localhost:3001/api/files/${selectedFile._id}`);
      setShowDeleteModal(false);
      if (activeTab === 'daily') {
        fetchDailyFiles();
        fetchShiftStats();
        fetchIdStats();
      } else {
        fetchMonthlyReports();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  // Download a file
  const downloadFile = async (fileId, originalName) => {
    try {
      window.open(`http://localhost:3001/api/files/${fileId}/download`, '_blank');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  // Effect to load data based on active tab
  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyFiles();
      fetchShiftStats();
      fetchIdStats();
    } else {
      fetchMonthlyReports();
      fetchMonthlyTrend();
    }
  }, [activeTab, date, month, year, shift, fileType]);

  // Shift statistics chart data
  const shiftChartData = {
    labels: shiftStats.map(stat => stat._id?.charAt(0)?.toUpperCase() + stat._id?.slice(1) || ''),
    datasets: [{
      label: 'File Count',
      data: shiftStats.map(stat => stat.count),
      backgroundColor: [
        'rgba(255, 193, 7, 0.6)',
        'rgba(40, 167, 69, 0.6)',
        'rgba(52, 58, 64, 0.6)'
      ],
      borderColor: [
        'rgb(255, 193, 7)',
        'rgb(40, 167, 69)',
        'rgb(52, 58, 64)'
      ],
      borderWidth: 1
    }]
  };

  // ID statistics chart data
  const idChartData = {
    labels: idStats.map(stat => stat._id),
    datasets: [{
      label: 'File Count',
      data: idStats.map(stat => stat.count),
      backgroundColor: 'rgba(23, 162, 184, 0.6)',
      borderColor: 'rgb(23, 162, 184)',
      borderWidth: 1
    }]
  };

  // Monthly trend chart data
  const monthlyTrendChartData = {
    labels: monthlyTrend.map(monthData => {
      return new Date(year, monthData._id - 1, 1).toLocaleString('default', { month: 'short' });
    }),
    datasets: [
      {
        label: 'Total Files',
        data: monthlyTrend.map(monthData => monthData.totalCount),
        type: 'bar',
        borderColor: 'rgb(23, 162, 184)',
        backgroundColor: 'rgba(23, 162, 184, 0.5)',
      },
      {
        label: 'Morning',
        data: monthlyTrend.map(monthData => {
          const shiftData = monthData.shifts?.find(s => s.shift === 'morning');
          return shiftData?.count || 0;
        }),
        borderColor: 'rgb(255, 193, 7)',
        backgroundColor: 'rgba(255, 193, 7, 0.5)',
      },
      {
        label: 'Afternoon',
        data: monthlyTrend.map(monthData => {
          const shiftData = monthData.shifts?.find(s => s.shift === 'afternoon');
          return shiftData?.count || 0;
        }),
        borderColor: 'rgb(40, 167, 69)',
        backgroundColor: 'rgba(40, 167, 69, 0.5)',
      },
      {
        label: 'Night',
        data: monthlyTrend.map(monthData => {
          const shiftData = monthData.shifts?.find(s => s.shift === 'night');
          return shiftData?.count || 0;
        }),
        borderColor: 'rgb(52, 58, 64)',
        backgroundColor: 'rgba(52, 58, 64, 0.5)',
      }
    ]
  };

  // Monthly ID distribution chart data
  const idDistributionData = {
    labels: monthlyReports.map(report => report._id),
    datasets: [{
      label: 'Files by ID',
      data: monthlyReports.map(report => report.count),
      backgroundColor: [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)',
        'rgba(255, 159, 64, 0.6)'
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)'
      ],
      borderWidth: 1
    }]
  };

  // Common chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'File Statistics'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'File Count'
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }  
  };

  return (
    <Container className="mt-4">
      <Card className="shadow">
        <Card.Header className="bg-dark text-white">
          <h1 className="h4 mb-0">File Management Dashboard</h1>
        </Card.Header>
        
        <Card.Body>
          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}

          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
            <Tab eventKey="daily" title="Daily Reports">
              <Row className="mb-4">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Date:</Form.Label>
                    <DatePicker
                      selected={date}
                      onChange={(date) => setDate(date)}
                      className="form-control"
                      dateFormat="dd/MM/yyyy"
                      maxDate={new Date()}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Shift:</Form.Label>
                    <Form.Select value={shift} onChange={e => setShift(e.target.value)}>
                      <option value="all">All Shifts</option>
                      <option value="morning">Morning (07:00-15:00)</option>
                      <option value="afternoon">Afternoon (15:00-23:00)</option>
                      <option value="night">Night (23:00-07:00)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>File Type:</Form.Label>
                    <Form.Select value={fileType} onChange={e => setFileType(e.target.value)}>
                      <option value="all">All Types</option>
                      <option value="document">Document</option>
                      <option value="photo">Photo</option>
                      <option value="video">Video</option>
                      <option value="audio">Audio</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Header className="bg-light">
                      <h3 className="h6 mb-0">Shift Distribution</h3>
                    </Card.Header>
                    <Card.Body>
                      <Bar data={shiftChartData} options={chartOptions} />
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Header className="bg-light">
                      <h3 className="h6 mb-0">ID Distribution</h3>
                    </Card.Header>
                    <Card.Body>
                      <Bar data={idChartData} options={chartOptions} />
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <h3 className="h5 mb-3">Daily Files</h3>
              {loading ? (
                <div className="text-center my-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2">Loading files...</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table striped bordered hover>
                    <thead className="table-dark">
                      <tr>
                        <th>Time</th>
                        <th>User ID</th>
                        <th>ID</th>
                        <th>File Name</th>
                        <th>Type</th>
                        <th>Shift</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyFiles.length > 0 ? (
                        dailyFiles.map((file) => (
                          <tr key={file._id}>
                            <td>{new Date(file.uploadTime).toLocaleTimeString()}</td>
                            <td>{file.userId}</td>
                            <td><Badge bg="success">{file.userSelectedId || 'N/A'}</Badge></td>
                            <td>{file.originalName}</td>
                            <td><Badge bg="info">{file.fileType}</Badge></td>
                            <td>
                              <Badge bg={
                                file.shift === 'morning' ? 'warning text-dark' :
                                file.shift === 'afternoon' ? 'success' : 'dark'
                              }>
                                {file.shift}
                              </Badge>
                            </td>
                            <td>
                              <Button
                                variant="primary"
                                size="sm"
                                className="me-2"
                                onClick={() => downloadFile(file._id, file.originalName)}
                                disabled={!file.filePath}
                              >
                                Download
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  setSelectedFile(file);
                                  setShowDeleteModal(true);
                                }}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center py-4">
                            No files found for the selected criteria
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </Tab>

            <Tab eventKey="monthly" title="Monthly Reports">
              <Row className="mb-4">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Year:</Form.Label>
                    <Form.Select value={year} onChange={e => setYear(parseInt(e.target.value))}>
                      {[2022, 2023, 2024, 2025].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Month:</Form.Label>
                    <Form.Select value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                      {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>
                          {new Date(2000, m - 1, 1).toLocaleString('default', {month: 'long'})}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>File Type:</Form.Label>
                    <Form.Select value={fileType} onChange={e => setFileType(e.target.value)}>
                      <option value="all">All Types</option>
                      <option value="document">Document</option>
                      <option value="photo">Photo</option>
                      <option value="video">Video</option>
                      <option value="audio">Audio</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Header className="bg-light">
                      <h3 className="h6 mb-0">Monthly Trend</h3>
                    </Card.Header>
                    <Card.Body>
                      <Line data={monthlyTrendChartData} options={chartOptions} />
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Header className="bg-light">
                      <h3 className="h6 mb-0">ID Distribution</h3>
                    </Card.Header>
                    <Card.Body>
                      <Pie data={idDistributionData} options={chartOptions} />
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <h3 className="h5 mb-3">Monthly Files by ID</h3>
              {loading ? (
                <div className="text-center my-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2">Loading reports...</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table striped bordered hover>
                    <thead className="table-dark">
                      <tr>
                        <th>ID</th>
                        <th>Total Files</th>
                        <th>Morning</th>
                        <th>Afternoon</th>
                        <th>Night</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyReports.length > 0 ? (
                        monthlyReports.map((report) => {
                          const morning = report.files.filter(f => f.shift === 'morning').length;
                          const afternoon = report.files.filter(f => f.shift === 'afternoon').length;
                          const night = report.files.filter(f => f.shift === 'night').length;
                          
                          return (
                            <tr key={report._id}>
                              <td><Badge bg="success">{report._id || 'N/A'}</Badge></td>
                              <td>{report.count}</td>
                              <td>{morning}</td>
                              <td>{afternoon}</td>
                              <td>{night}</td>
                              <td>
                                <Button
                                  variant="info"
                                  size="sm"
                                  onClick={() => {
                                    setDate(new Date(year, month - 1, 1));
                                    setShift('all');
                                    setActiveTab('daily');
                                  }}
                                >
                                  View Daily
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center py-4">
                            No reports found for the selected month
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </Tab>
          </Tabs>
        </Card.Body>
        
        <Card.Footer className="text-muted">
          Last updated: {new Date().toLocaleString()}
        </Card.Footer>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete file: <strong>{selectedFile?.originalName}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={deleteFile}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminPanel;