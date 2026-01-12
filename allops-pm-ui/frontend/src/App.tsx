import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Report from './pages/Report';
import Customer from './pages/Customer';
import CustomerDetail from './pages/CustomerDetail';
import NewCustomer from './pages/NewCustomer';
import TaskPM from './pages/TaskPM';
import UploadPM from './pages/UploadPM';
import PMImport from './pages/PMImport';
import PMDetails from './pages/PMDetails';
import NewServer from './pages/NewServer';
import Settings from './pages/Settings';
import './index.css';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'allops-theme';

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    document.body.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <Router>
      <div className="app-layout">
        <Sidebar theme={theme} onToggleTheme={toggleTheme} />
        <main className="main-content">
          <Routes>
            <Route path="/report" element={<Report />} />
            <Route path="/customer" element={<Customer />} />
              <Route path="/customer/new" element={<NewCustomer />} />
              <Route path="/customer/:id" element={<CustomerDetail />} />
            <Route path="/task-pm" element={<TaskPM />} />
            <Route path="/task-pm/:custId" element={<TaskPM />} />
            <Route path="/customer/:id/new-server" element={<NewServer />} />
            <Route path="/pm/:pmId" element={<PMDetails />} />
            <Route path="/pm/import" element={<PMImport />} />
            <Route path="/upload-pm" element={<UploadPM />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/" element={<Report />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;