import React, { useEffect, useState } from 'react';
import { Customer } from '../types';
import { fetchCustomers } from '../api/customers'; // Assuming you have an API utility to fetch customers

const CustomerTable: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

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
        // Logic to open edit modal
    };

    const handlePMPlan = (customerId: number) => {
        // Logic to navigate to PM plan page
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <button onClick={() => {/* Logic to open new customer modal */}}>New Customer</button>
            <table>
                <thead>
                    <tr>
                        <th>Action</th>
                        <th>ชื่อลูกค้า</th>
                        <th>คำย่อ</th>
                        <th>รายละเอียดเสริม</th>
                        <th>วันที่สร้าง</th>
                    </tr>
                </thead>
                <tbody>
                    {customers.map(customer => (
                        <tr key={customer.id}>
                            <td>
                                <button onClick={() => handleEdit(customer.id)}>Edit</button>
                                <button onClick={() => handlePMPlan(customer.id)}>PM Plan</button>
                            </td>
                            <td>{customer.cust_name}</td>
                            <td>{customer.code}</td>
                            <td>{customer.remark}</td>
                            <td>{new Date(customer.created_at).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CustomerTable;