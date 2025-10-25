import React from 'react';
import CustomerTable from '../components/CustomerTable';

const CustomerPage: React.FC = () => {
    return (
        <div className="container">
            <div className="page-header">
                <h1 className="page-title">Customer Management</h1>
                <p className="page-subtitle">
                    จัดการข้อมูลลูกค้าและแผนการบำรุงรักษาระบบ
                </p>
            </div>
            
            <CustomerTable />
        </div>
    );
};

export default CustomerPage;