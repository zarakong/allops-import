import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css'; // Assuming you have a CSS file for styling

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
            <button className="toggle-button" onClick={toggleSidebar}>
                {isOpen ? 'Collapse' : 'Expand'}
            </button>
            <nav className="sidebar-menu">
                <ul>
                    <li>
                        <Link to="/report">Report</Link>
                    </li>
                    <li>
                        <Link to="/customer">Customer</Link>
                    </li>
                    <li>
                        <Link to="/task-pm">Task PM</Link>
                    </li>
                    <li>
                        <Link to="/upload-pm">Upload PM data</Link>
                    </li>
                </ul>
            </nav>
        </div>
    );
};

export default Sidebar;