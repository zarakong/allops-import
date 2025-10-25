import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Customer } from '../types';
import { fetchCustomers } from '../api/customers';

// SVG Icons
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const CustomerTable: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [searchInput, setSearchInput] = useState<string>('');

    useEffect(() => {
        const loadCustomers = async () => {
            try {
                const data = await fetchCustomers();
                setCustomers(data);
            } catch (error) {
                console.error('Error fetching customers:', error);
            } finally {
                setLoading(false);
            }
        };

        loadCustomers();
    }, []);

    const handleEdit = (customerId: number) => {
        // Navigate to customer detail page
        navigate(`/customer/${customerId}`);
    };

    const navigate = useNavigate();
    const handlePMPlan = (customerId: number) => {
        // SPA navigation to PM Plan page for this customer
        navigate(`/task-pm/${customerId}`);
    };

    const handleNewCustomer = () => {
        // Navigate to New Customer page
        navigate('/customer/new');
    };

    // modal state removed; details now shown on separate page

    const filteredCustomers = customers.filter(customer =>
        (customer.cust_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((customer.cust_code || (customer as any).code) || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((customer.project_name || customer.cust_desc || (customer as any).remark) || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((customer as any).env_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="card">
                <div className="card-body">
                    <div className="loading">
                        <div className="spinner"></div>
                        กำลังโหลดข้อมูลลูกค้า...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 className="card-title">Customer Management</h3>
                        <p className="card-subtitle">ทั้งหมด {customers.length} รายการ</p>
                    </div>
                    <button className="btn btn-primary" onClick={handleNewCustomer}>
                        <PlusIcon />
                        New Create
                    </button>
                </div>
                
                <div className="search-input" style={{ marginTop: 'var(--space-4)', maxWidth: '400px' }}>
                    <svg className="search-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อลูกค้า รหัส หรือรายละเอียด..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') setSearchTerm(searchInput); }}
                    />
                    <button className="search-btn" onClick={() => setSearchTerm(searchInput)} title="ค้นหา">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="card-body" style={{ padding: 0 }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>การจัดการ</th>
                                <th>ชื่อลูกค้า</th>
                                <th>รหัสลูกค้า</th>
                                <th>Env</th>
                                <th>รายละเอียดเสริม</th>
                                <th>วันที่สร้าง</th>
                                <th>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
                                        <div style={{ color: 'var(--gray-500)' }}>
                                            {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีข้อมูลลูกค้า'}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCustomers.map(customer => (
                                    <tr key={customer.id}>
                                        <td>
                                            <div className="table-actions">
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => handleEdit(customer.id)}
                                                    title="รายละเอียด"
                                                >
                                                    <EditIcon />
                                                    Details
                                                </button>
                                                <button 
                                                    className="btn btn-sm btn-primary" 
                                                    onClick={() => handlePMPlan(customer.id)}
                                                    title="จัดการแผน PM"
                                                >
                                                    <CalendarIcon />
                                                    PM Plan
                                                </button>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{customer.cust_name}</div>
                                        </td>
                                        <td>
                                            <span className="badge badge-info">
                                                {customer.cust_code || (customer as any).code || '-'}
                                            </span>
                                        </td>
                                        <td>{(customer as any).env_name || '-'}</td>
                                        <td>{customer.project_name || customer.cust_desc || (customer as any).remark || '-'}</td>
                                        <td>{new Date(customer.created_at).toLocaleDateString('th-TH')}</td>
                                        <td>
                                            <span style={{ color: customer.status ? 'green' : 'red', fontWeight: 600 }}>
                                                {customer.status ? 'Support' : 'END Support'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* CustomerDetailsModal removed: details are now shown on a dedicated page */}
        </div>
    );
};

export default CustomerTable;