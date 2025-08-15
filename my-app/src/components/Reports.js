import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

function Reports({ date, setDate }) {
  const [shiftData, setShiftData] = useState([]);
  const [idData, setIdData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReports();
  }, [date]);

  const fetchReports = async () => {
    try {
      const [shiftRes, idRes, monthlyRes] = await Promise.all([
        axios.get(`http://localhost:3001/api/reports/shift?date=${date}`),
        axios.get(`http://localhost:3001/api/reports/id?date=${date}`),
        axios.get(`http://localhost:3001/api/reports/monthly?year=${date.split('-')[0]}&month=${date.split('-')[1]}`)
      ]);

      setShiftData(shiftRes.data);
      setIdData(idRes.data);
      setMonthlyData(monthlyRes.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch reports');
      setLoading(false);
    }
  };

  const shiftChartData = {
    labels: shiftData.map(item => item._id),
    datasets: [{
      label: 'Files per Shift',
      data: shiftData.map(item => item.count),
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
    }],
  };

  const idChartData = {
    labels: idData.map(item => item._id),
    datasets: [{
      label: 'Files per ID',
      data: idData.map(item => item.count),
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1,
    }],
  };

  const monthlyChartData = {
    labels: monthlyData.map(item => `Day ${item._id}`),
    datasets: [
      {
        label: 'Morning',
        data: monthlyData.map(item => item.shifts.find(s => s.shift === 'morning')?.count || 0),
        borderColor: 'rgba(255, 99, 132, 1)',
        fill: false,
      },
      {
        label: 'Afternoon',
        data: monthlyData.map(item => item.shifts.find(s => s.shift === 'afternoon')?.count || 0),
        borderColor: 'rgba(54, 162, 235, 1)',
        fill: false,
      },
      {
        label: 'Night',
        data: monthlyData.map(item => item.shifts.find(s => s.shift === 'night')?.count || 0),
        borderColor: 'rgba(75, 192, 192, 1)',
        fill: false,
      },
    ],
  };

  if (loading) return <div className="text-center">Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div>
      <h2>Reports</h2>
      <div className="mb-3">
        <label htmlFor="date" className="form-label">Select Date:</label>
        <input
          type="date"
          id="date"
          className="form-control w-25"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="chart-container">
        <h3>Files by Shift</h3>
        <Bar data={shiftChartData} options={{ responsive: true }} />
      </div>
      <div className="chart-container">
        <h3>Files by ID</h3>
        <Bar data={idChartData} options={{ responsive: true }} />
      </div>
      <div className="chart-container">
        <h3>Monthly Files by Shift</h3>
        <Line data={monthlyChartData} options={{ responsive: true }} />
      </div>
    </div>
  );
}

export default Reports;