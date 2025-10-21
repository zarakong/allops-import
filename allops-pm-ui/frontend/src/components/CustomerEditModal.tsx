import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { Customer } from '../types';

interface CustomerEditModalProps {
    isOpen: boolean;
    onRequestClose: () => void;
    customerData: Customer | null;
    onSave: (updatedCustomer: Customer) => void;
}

const CustomerEditModal: React.FC<CustomerEditModalProps> = ({ isOpen, onRequestClose, customerData, onSave }) => {
    const [formData, setFormData] = useState<Customer | null>(null);

    useEffect(() => {
        if (customerData) {
            setFormData(customerData);
        }
    }, [customerData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (formData) {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData) {
            onSave(formData);
            onRequestClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onRequestClose={onRequestClose} contentLabel="Edit Customer">
            <h2>Edit Customer</h2>
            {formData && (
                <form onSubmit={handleSubmit}>
                    <div>
                        <label>
                            ชื่อลูกค้า:
                            <input type="text" name="cust_name" value={formData.cust_name} onChange={handleChange} required />
                        </label>
                    </div>
                    <div>
                        <label>
                            คำย่อ:
                            <input type="text" name="code" value={formData.code} onChange={handleChange} required />
                        </label>
                    </div>
                    <div>
                        <label>
                            รายละเอียดเสริม:
                            <input type="text" name="Remark" value={formData.Remark} onChange={handleChange} />
                        </label>
                    </div>
                    <div>
                        <button type="submit">Save</button>
                        <button type="button" onClick={onRequestClose}>Cancel</button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default CustomerEditModal;