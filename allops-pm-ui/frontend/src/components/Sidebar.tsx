import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

// SVG Icons
const ReportIcon = () => (
  <svg className="menu-icon" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
  </svg>
);

const CustomerIcon = () => (
  <svg className="menu-icon" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

const TaskIcon = () => (
  <svg className="menu-icon" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
  </svg>
);

const UploadIcon = () => (
  <svg className="menu-icon" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="menu-icon" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M11.983 1.588a1 1 0 00-1.966 0l-.186 1.116a6.987 6.987 0 00-1.76.732L7.02 2.98a1 1 0 00-1.414 1.414l.456 1.05a7.004 7.004 0 00-.732 1.76l-1.116.186a1 1 0 000 1.966l1.116.186a6.987 6.987 0 00.732 1.76l-.456 1.05a1 1 0 001.414 1.414l1.05-.456a7.004 7.004 0 001.76.732l.186 1.116a1 1 0 001.966 0l.186-1.116a6.987 6.987 0 001.76-.732l1.05.456a1 1 0 001.414-1.414l-.456-1.05a7.004 7.004 0 00.732-1.76l1.116-.186a1 1 0 000-1.966l-1.116-.186a6.987 6.987 0 00-.732-1.76l.456-1.05A1 1 0 0012.733 2.98l-1.05.456a7.004 7.004 0 00-1.76-.732l-.186-1.116zM10 12a2 2 0 110-4 2 2 0 010 4z" clipRule="evenodd" />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const menuItems = [
    { path: '/report', label: 'Reports', icon: <ReportIcon />, section: 'Analytics' },
    { path: '/customer', label: 'Customers', icon: <CustomerIcon />, section: 'Management' },
    { path: '/task-pm', label: 'PM Tasks', icon: <TaskIcon />, section: 'Operations' },
    { path: '/upload-pm', label: 'Upload Data', icon: <UploadIcon />, section: 'Operations' },
    { path: '/settings', label: 'Settings', icon: <SettingsIcon />, section: 'Administration' },
  ];

  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  return (
    <>
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        <MenuIcon />
      </button>
      
      {isOpen && <div className="sidebar-overlay active" onClick={toggleSidebar} />}
      
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>AllOps</h2>
          <div className="sidebar-brand">
            Project Management
          </div>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">A</div>
          <div className="user-info">
            <div className="user-name">Admin User</div>
            <div className="user-role">Administrator</div>
          </div>
        </div>

        <nav className="sidebar-menu">
          {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section} className="menu-section">
              <div className="menu-section-title">{section}</div>
              {items.map((item) => (
                <li key={item.path}>
                  <Link 
                    to={item.path}
                    className={location.pathname === item.path ? 'active' : ''}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="version">v1.0.0</span>
          <span className="copyright">© 2025 AllOps</span>
        </div>
      </div>
    </>
  );
};

export default Sidebar;