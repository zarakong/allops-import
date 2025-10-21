import React, { useEffect, useState } from 'react';
import CustomerTable from '../components/CustomerTable';
import { Customer } from '../types';

const CustomerPage: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const response = await fetch('/api/customers');
                const data = await response.json();
                setCustomers(data);
            } catch (error) {
                console.error('Error fetching customers:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCustomers();
    }, []);

    const handleNewCustomer = () => {
        // Logic to open modal for adding a new customer
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h1>Customer Management</h1>
            <button onClick={handleNewCustomer}>New Customer</button>
            <CustomerTable customers={customers} />
        </div>
    );
};

export default CustomerPage;