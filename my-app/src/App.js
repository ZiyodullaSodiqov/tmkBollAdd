import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import FileList from './components/FileList';
import Reports from './components/Reports';
import './App.css';
import AdminPanel from './AdminPanel';

function App() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="container mt-4">
          <Routes>
            <Route path="/" element={<AdminPanel />} />
            <Route path="/reports" element={<Reports date={date} setDate={setDate} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;