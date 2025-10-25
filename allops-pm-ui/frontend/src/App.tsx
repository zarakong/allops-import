import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Report from './pages/Report';
import Customer from './pages/Customer';
import CustomerDetail from './pages/CustomerDetail';
import NewCustomer from './pages/NewCustomer';
import TaskPM from './pages/TaskPM';
import UploadPM from './pages/UploadPM';
import './index.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-layout">
        <Sidebar />
            <main className="main-content">
          <Routes>
            <Route path="/report" element={<Report />} />
            <Route path="/customer" element={<Customer />} />
              <Route path="/customer/new" element={<NewCustomer />} />
              <Route path="/customer/:id" element={<CustomerDetail />} />
            <Route path="/task-pm" element={<TaskPM />} />
            <Route path="/task-pm/:custId" element={<TaskPM />} />
            <Route path="/upload-pm" element={<UploadPM />} />
            <Route path="/" element={<Report />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;