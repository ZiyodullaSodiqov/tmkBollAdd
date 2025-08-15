import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Spinner, Alert, Modal, Button, Form, Badge, Table, Card, Container, Nav, Row, Col
} from 'react-bootstrap';
import { Bar } from 'react-chartjs-2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import moment from 'moment-timezone';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const AdminPanel = () => {
  // State
  const [activeTab, setActiveTab] = useState('daily');
  const [date, setDate] = useState(new Date());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [shift, setShift] = useState('all');
  const [fileType, setFileType] = useState('all');
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState({
    shift: [],
    id: [],
    monthly: [],
    idByShift: []
  });
  const [loading, setLoading] = useState({
    files: false,
    stats: false,
    delete: false
  });
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Format date as YYYY-MM-DD in UTC
  const formatDate = (date) => {
    return moment(date).tz('UTC').format('YYYY-MM-DD');
  };

  // Fetch files with filters
  const fetchFiles = async () => {
    try {
      setLoading(prev => ({ ...prev, files: true }));
      setError(null); // Clear previous errors
      const params = { shift: shift === 'all' ? null : shift, fileType: fileType === 'all' ? null : fileType };
      
      if (activeTab === 'daily') {
        params.date = formatDate(date);
      } else {
        params.year = year;
        params.month = month;
      }
      
      const res = await axios.get('http://localhost:3001/api/files', { params });
      if (res.data.length === 0) {
        setError('No files found for the selected date and filters.');
      }
      setFiles(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch files. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, files: false }));
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      setError(null); // Clear previous errors
      const shiftParam = shift === 'all' ? null : shift;
      const fileTypeParam = fileType === 'all' ? null : fileType;

      if (activeTab === 'daily') {
        const dateStr = formatDate(date);
        const [shiftRes, idRes, idByShiftRes] = await Promise.all([
          axios.get('http://localhost:3001/api/reports/shift', { params: { date: dateStr, fileType: fileTypeParam } }),
          axios.get('http://localhost:3001/api/reports/id', { params: { date: dateStr, shift: shiftParam, fileType: fileTypeParam } }),
          shift === 'all' ? axios.get('http://localhost:3001/api/reports/id_by_shift', { params: { date: dateStr, fileType: fileTypeParam } }) : Promise.resolve({ data: [] })
        ]);
        
        const allShifts = ['morning', 'afternoon', 'night'];
        const shiftData = allShifts.map(shift => ({
          _id: shift,
          count: shiftRes.data.find(s => s._id === shift)?.count || 0
        }));
        
        if (shiftData.every(s => s.count === 0) && idRes.data.length === 0) {
          setError('No statistics available for the selected date and filters.');
        }

        setStats({
          shift: shiftData,
          id: idRes.data,
          monthly: [],
          idByShift: idByShiftRes.data
        });
      } else {
        const [monthlyRes, idRes, idByShiftRes] = await Promise.all([
          axios.get('http://localhost:3001/api/reports/monthly', { params: { year, month, shift: shiftParam, fileType: fileTypeParam } }),
          axios.get('http://localhost:3001/api/reports/id', { params: { year, month, shift: shiftParam, fileType: fileTypeParam } }),
          shift === 'all' ? axios.get('http://localhost:3001/api/reports/id_by_shift', { params: { year, month, fileType: fileTypeParam } }) : Promise.resolve({ data: [] })
        ]);
        
        if (monthlyRes.data.length === 0 && idRes.data.length === 0) {
          setError('No statistics available for the selected month and filters.');
        }

        setStats({
          shift: [],
          id: idRes.data,
          monthly: monthlyRes.data,
          idByShift: idByShiftRes.data
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch statistics. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  // Delete a file
  const deleteFile = async () => {
    try {
      setLoading(prev => ({ ...prev, delete: true }));
      await axios.delete(`http://localhost:3001/api/files/${selectedFile._id}`);
      setShowDeleteModal(false);
      fetchFiles();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete file.');
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
    }
  };

  // Download a file
  const downloadFile = async (fileId) => {
    try {
      window.open(`http://localhost:3001/api/files/${fileId}/download`, '_blank');
    } catch (err) {
      setError('Failed to initiate download.');
    }
  };

  // Effect to load data
  useEffect(() => {
    fetchFiles();
    fetchStats();
  }, [activeTab, date, month, year, shift, fileType]);

  // Chart data generators
  const getShiftChartData = () => ({
    labels: stats.shift.map(s => s._id.charAt(0).toUpperCase() + s._id.slice(1)),
    datasets: [{
      label: 'Files by Shift',
      data: stats.shift.map(s => s.count),
      backgroundColor: [
        'rgba(255, 193, 7, 0.6)',  // morning
        'rgba(40, 167, 69, 0.6)',  // afternoon
        'rgba(52, 58, 64, 0.6)'    // night
      ],
      borderColor: [
        'rgb(255, 193, 7)',
        'rgb(40, 167, 69)',
        'rgb(52, 58, 64)'
      ],
      borderWidth: 1
    }]
  });

  const getIdChartData = () => ({
    labels: stats.id.map(s => s._id || 'Unassigned'),
    datasets: [{
      label: 'Files by ID',
      data: stats.id.map(s => s.count),
      backgroundColor: 'rgba(23, 162, 184, 0.6)',
      borderColor: 'rgb(23, 162, 184)',
      borderWidth: 1
    }]
  });

  const getMonthlyChartData = () => ({
    labels: stats.monthly.map(r => `Day ${r._id}`),
    datasets: [
      {
        label: 'Morning',
        data: stats.monthly.map(r => r.shifts.find(s => s.shift === 'morning')?.count || 0),
        backgroundColor: 'rgba(255, 193, 7, 0.6)',
        borderColor: 'rgb(255, 193, 7)',
        borderWidth: 1
      },
      {
        label: 'Afternoon',
        data: stats.monthly.map(r => r.shifts.find(s => s.shift === 'afternoon')?.count || 0),
        backgroundColor: 'rgba(40, 167, 69, 0.6)',
        borderColor: 'rgb(40, 167, 69)',
        borderWidth: 1
      },
      {
        label: 'Night',
        data: stats.monthly.map(r => r.shifts.find(s => s.shift === 'night')?.count || 0),
        backgroundColor: 'rgba(52, 58, 64, 0.6)',
        borderColor: 'rgb(52, 58, 64)',
        borderWidth: 1
      }
    ]
  });

  const getIdByShiftChartData = () => {
    const ids = [...new Set(stats.idByShift.map(s => s._id.userSelectedId || 'Unassigned'))].sort();
    const shifts = ['morning', 'afternoon', 'night'];

    const datasets = shifts.map(shift => ({
      label: shift.charAt(0).toUpperCase() + shift.slice(1),
      data: ids.map(id => stats.idByShift.find(s => (s._id.userSelectedId || 'Unassigned') === id && s._id.shift === shift)?.count || 0),
      backgroundColor: shift === 'morning' ? 'rgba(255, 193, 7, 0.6)' : shift === 'afternoon' ? 'rgba(40, 167, 69, 0.6)' : 'rgba(52, 58, 64, 0.6)',
      borderColor: shift === 'morning' ? 'rgb(255, 193, 7)' : shift === 'afternoon' ? 'rgb(40, 167, 69)' : 'rgb(52, 58, 64)',
      borderWidth: 1
    }));

    return {
      labels: ids,
      datasets
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'File Statistics' }
    },
    scales: { y: { beginAtZero: true } },
    animation: { duration: 1000 }
  };

  const stackedOptions = {
    ...chartOptions,
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true }
    }
  };

  const renderShiftBadge = (shift) => {
    let variant = 'secondary';
    if (shift === 'morning') variant = 'warning text-dark';
    if (shift === 'afternoon') variant = 'success';
    if (shift === 'night') variant = 'dark';
    return <Badge bg={variant}>{shift.charAt(0).toUpperCase() + shift.slice(1)}</Badge>;
  };

  return (
    <Container className="mt-4">
      <Card className="shadow">
        <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center">
          <h1 className="h4 mb-0">Administrative File Management Panel</h1>
          <Nav variant="pills" activeKey={activeTab} onSelect={setActiveTab}>
            <Nav.Item>
              <Nav.Link eventKey="daily" className="text-white">Daily Reports</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="monthly" className="text-white">Monthly Reports</Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Header>
        
        <Card.Body>
          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}

          <Row className="mb-4 g-3">
            {activeTab === 'daily' ? (
              <>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label htmlFor="date-picker">Date</Form.Label>
                    <DatePicker
                      id="date-picker"
                      selected={date}
                      onChange={setDate}
                      className="form-control"
                      dateFormat="dd/MM/yyyy"
                      maxDate={new Date()}
                      aria-label="Select date"
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label htmlFor="shift-select">Shift</Form.Label>
                    <Form.Select
                      id="shift-select"
                      value={shift}
                      onChange={e => setShift(e.target.value)}
                      aria-label="Select shift"
                    >
                      <option value="all">All Shifts</option>
                      <option value="morning">Morning (07:00-15:00)</option>
                      <option value="afternoon">Afternoon (15:00-23:00)</option>
                      <option value="night">Night (23:00-07:00)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </>
            ) : (
              <>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label htmlFor="year-select">Year</Form.Label>
                    <Form.Select
                      id="year-select"
                      value={year}
                      onChange={e => setYear(parseInt(e.target.value))}
                      aria-label="Select year"
                    >
                      {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label htmlFor="month-select">Month</Form.Label>
                    <Form.Select
                      id="month-select"
                      value={month}
                      onChange={e => setMonth(parseInt(e.target.value))}
                      aria-label="Select month"
                    >
                      {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>
                          {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label htmlFor="shift-select-monthly">Shift</Form.Label>
                    <Form.Select
                      id="shift-select-monthly"
                      value={shift}
                      onChange={e => setShift(e.target.value)}
                      aria-label="Select shift for monthly report"
                    >
                      <option value="all">All Shifts</option>
                      <option value="morning">Morning (07:00-15:00)</option>
                      <option value="afternoon">Afternoon (15:00-23:00)</option>
                      <option value="night">Night (23:00-07:00)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </>
            )}
            <Col md={3}>
              <Form.Group>
                <Form.Label htmlFor="file-type-select">File Type</Form.Label>
                <Form.Select
                  id="file-type-select"
                  value={fileType}
                  onChange={e => setFileType(e.target.value)}
                  aria-label="Select file type"
                >
                  <option value="all">All Types</option>
                  <option value="zip">ZIP</option>
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                  <option value="pdf">PDF</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3} className="d-flex align-items-end">
              <Button 
                variant="primary" 
                onClick={() => {
                  fetchFiles();
                  fetchStats();
                }}
                disabled={loading.files || loading.stats}
                aria-label="Refresh data"
              >
                {loading.files || loading.stats ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            </Col>
          </Row>

          <Row className="mb-4 g-3">
            {activeTab === 'daily' ? (
              <>
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Header className="bg-light">
                      <h3 className="h6 mb-0">File Distribution by Shift</h3>
                    </Card.Header>
                    <Card.Body>
                      {loading.stats ? (
                        <div className="text-center py-4">
                          <Spinner animation="border" size="sm" aria-label="Loading shift chart" />
                        </div>
                      ) : stats.shift.every(s => s.count === 0) ? (
                        <div className="text-center py-4">No shift data available</div>
                      ) : (
                        <Bar data={getShiftChartData()} options={chartOptions} />
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Header className="bg-light">
                      <h3 className="h6 mb-0">File Distribution by ID{shift !== 'all' ? ` (${shift.charAt(0).toUpperCase() + shift.slice(1)} Shift)` : ' and Shift'}</h3>
                    </Card.Header>
                    <Card.Body>
                      {loading.stats ? (
                        <div className="text-center py-4">
                          <Spinner animation="border" size="sm" aria-label="Loading ID chart" />
                        </div>
                      ) : (shift === 'all' && stats.idByShift.length === 0) || (shift !== 'all' && stats.id.length === 0) ? (
                        <div className="text-center py-4">No ID data available</div>
                      ) : (
                        <Bar data={shift === 'all' ? getIdByShiftChartData() : getIdChartData()} options={shift === 'all' ? stackedOptions : chartOptions} />
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </>
            ) : (
              <>
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Header className="bg-light">
                      <h3 className="h6 mb-0">Monthly File Distribution by Shift</h3>
                    </Card.Header>
                    <Card.Body>
                      {loading.stats ? (
                        <div className="text-center py-4">
                          <Spinner animation="border" size="sm" aria-label="Loading monthly shift chart" />
                        </div>
                      ) : stats.monthly.length === 0 ? (
                        <div className="text-center py-4">No monthly shift data available</div>
                      ) : (
                        <Bar data={getMonthlyChartData()} options={chartOptions} />
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="h-100">
                    <Card.Header className="bg-light">
                      <h3 className="h6 mb-0">File Distribution by ID{shift !== 'all' ? ` (${shift.charAt(0).toUpperCase() + shift.slice(1)} Shift)` : ' and Shift'}</h3>
                    </Card.Header>
                    <Card.Body>
                      {loading.stats ? (
                        <div className="text-center py-4">
                          <Spinner animation="border" size="sm" aria-label="Loading ID distribution chart" />
                        </div>
                      ) : (shift === 'all' && stats.idByShift.length === 0) || (shift !== 'all' && stats.id.length === 0) ? (
                        <div className="text-center py-4">No ID data available</div>
                      ) : (
                        <Bar data={shift === 'all' ? getIdByShiftChartData() : getIdChartData()} options={shift === 'all' ? stackedOptions : chartOptions} />
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </>
            )}
          </Row>

          <Card className="mb-4">
            <Card.Header className="bg-light">
              <h3 className="h6 mb-0">
                {activeTab === 'daily' ? 'Daily File Summary' : 'Monthly File Summary'}
              </h3>
            </Card.Header>
            <Card.Body className="p-0">
              {loading.files ? (
                <div className="text-center py-5">
                  <Spinner animation="border" aria-label="Loading files" />
                  <p className="mt-2">Loading files...</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table striped bordered hover className="mb-0">
                    <thead className="table-dark">
                      <tr>
                        {activeTab === 'daily' ? (
                          <>
                            <th>Time</th>
                            <th>User ID</th>
                            <th>Assigned ID</th>
                            <th>File Name</th>
                            <th>Type</th>
                            <th>Shift</th>
                            <th>Actions</th>
                          </>
                        ) : (
                          <>
                            <th>Day</th>
                            <th>Total Files</th>
                            <th>Morning</th>
                            <th>Afternoon</th>
                            <th>Night</th>
                            <th>Actions</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {activeTab === 'daily' ? (
                        files.length > 0 ? (
                          files.map(file => (
                            <tr key={file._id}>
                              <td>{moment(file.uploadTime).tz('UTC').format('HH:mm:ss')}</td>
                              <td>{file.userId}</td>
                              <td>
                                <Badge bg={file.userSelectedId ? 'success' : 'secondary'}>
                                  {file.userSelectedId || 'N/A'}
                                </Badge>
                              </td>
                              <td>{file.originalName}</td>
                              <td>
                                <Badge bg="info" className="text-capitalize">
                                  {file.fileType}
                                </Badge>
                              </td>
                              <td>{renderShiftBadge(file.shift)}</td>
                              <td>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="me-2"
                                  onClick={() => downloadFile(file._id)}
                                  disabled={!file.filePath}
                                  aria-label={`Download file ${file.originalName}`}
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
                                  disabled={loading.delete}
                                  aria-label={`Delete file ${file.originalName}`}
                                >
                                  {loading.delete && selectedFile?._id === file._id ? 'Deleting...' : 'Delete'}
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="text-center py-4">
                              No files found for the selected criteria
                            </td>
                          </tr>
                        )
                      ) : (
                        stats.monthly.length > 0 ? (
                          stats.monthly.map(report => (
                            <tr key={report._id}>
                              <td>Day {report._id}</td>
                              <td>{report.total}</td>
                              <td>{report.shifts.find(s => s.shift === 'morning')?.count || 0}</td>
                              <td>{report.shifts.find(s => s.shift === 'afternoon')?.count || 0}</td>
                              <td>{report.shifts.find(s => s.shift === 'night')?.count || 0}</td>
                              <td>
                                <Button
                                  variant="info"
                                  size="sm"
                                  onClick={() => {
                                    setDate(new Date(year, month - 1, report._id));
                                    setShift('all');
                                    setActiveTab('daily');
                                  }}
                                  aria-label={`View details for day ${report._id}`}
                                >
                                  View Details
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="text-center py-4">
                              No data found for the selected criteria
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Card.Body>
        
        <Card.Footer className="text-muted small">
          Last updated: {moment().tz('UTC').format('YYYY-MM-DD HH:mm:ss')} (UTC)
        </Card.Footer>
      </Card>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm File Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to permanently delete the file: 
          <strong className="d-block my-2">{selectedFile?.originalName}</strong>
          This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={loading.delete}
            aria-label="Cancel deletion"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={deleteFile}
            disabled={loading.delete}
            aria-label="Confirm delete file"
          >
            {loading.delete ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminPanel;