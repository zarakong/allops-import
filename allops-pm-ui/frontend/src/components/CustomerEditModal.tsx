import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Customer } from '../types';

interface CustomerEditModalProps {
    isOpen: boolean;
    onRequestClose: () => void;
    customerData: Customer | null;
    onSave: (updatedCustomer: Customer) => void;
}

const CustomerEditModal: React.FC<CustomerEditModalProps> = ({ 
    isOpen, 
    onRequestClose, 
    customerData, 
    onSave 
}) => {
    const [formData, setFormData] = useState<Customer | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (customerData) {
            // normalize older field names (code -> cust_code, remark -> cust_desc)
            const normalized = {
                ...customerData,
                cust_code: (customerData as any).cust_code || (customerData as any).code || '',
                cust_desc: (customerData as any).cust_desc || (customerData as any).remark || '',
                project_name: (customerData as any).project_name || ''
            } as Customer;

            setFormData(normalized);
            setErrors({});
        }
    }, [customerData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (formData) {
            const { name, value } = e.target;
            setFormData({ ...formData, [name]: value });
            
            // Clear error for this field when user starts typing
            if (errors[name]) {
                setErrors({ ...errors, [name]: '' });
            }
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData?.cust_name?.trim()) {
            newErrors.cust_name = 'ชื่อลูกค้าเป็นข้อมูลที่จำเป็น';
        }

        if (!((formData as any).cust_code || (formData as any).code)) {
            newErrors.cust_code = 'รหัสลูกค้าเป็นข้อมูลที่จำเป็น';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData || !validateForm()) {
            return;
        }

        setIsSubmitting(true);
        
        try {
            await onSave(formData);
            onRequestClose();
        } catch (error) {
            console.error('Error saving customer:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setErrors({});
        onRequestClose();
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title={customerData?.id ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}
            size="md"
        >
            {formData && (
                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="cust_name">
                                ชื่อลูกค้า <span style={{ color: 'var(--error-500)' }}>*</span>
                            </label>
                            <input 
                                type="text" 
                                id="cust_name"
                                name="cust_name" 
                                value={formData.cust_name} 
                                onChange={handleChange} 
                                placeholder="กรอกชื่อลูกค้า"
                                className={errors.cust_name ? 'error' : ''}
                                disabled={isSubmitting}
                            />
                            {errors.cust_name && (
                                <div className="form-error">{errors.cust_name}</div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="cust_code">
                                รหัสลูกค้า <span style={{ color: 'var(--error-500)' }}>*</span>
                            </label>
                            <input 
                                type="text" 
                                id="cust_code"
                                name="cust_code" 
                                value={(formData as any).cust_code || ''} 
                                onChange={handleChange} 
                                placeholder="กรอกรหัสลูกค้า"
                                className={(errors as any).cust_code ? 'error' : ''}
                                disabled={isSubmitting}
                            />
                            {(errors as any).cust_code && (
                                <div className="form-error">{(errors as any).cust_code}</div>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="project_name">รายละเอียดเสริม</label>
                        <textarea 
                            id="project_name"
                            name="project_name" 
                            value={(formData as any).project_name || ''} 
                            onChange={handleChange}
                            placeholder="กรอกรายละเอียดเสริม (ไม่จำเป็น)"
                            rows={3}
                            disabled={isSubmitting}
                            style={{ resize: 'vertical' }}
                        />
                        <div className="form-help">
                            ข้อมูลเพิ่มเติมเกี่ยวกับลูกค้า เช่น ชื่อโครงการ ที่อยู่ หมายเลขติดต่อ หรือหมายเหตุพิเศษ
                        </div>
                    </div>

                    <div 
                        style={{ 
                            display: 'flex', 
                            gap: 'var(--space-3)', 
                            justifyContent: 'flex-end',
                            marginTop: 'var(--space-6)',
                            paddingTop: 'var(--space-6)',
                            borderTop: '1px solid var(--gray-200)'
                        }}
                    >
                        <button 
                            type="button" 
                            className="btn btn-secondary"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            ยกเลิก
                        </button>
                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="spinner" style={{ width: '1rem', height: '1rem' }}></div>
                                    กำลังบันทึก...
                                </>
                            ) : (
                                <>
                                    <svg 
                                        width="16" 
                                        height="16" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round" 
                                            strokeWidth={2} 
                                            d="M5 13l4 4L19 7" 
                                        />
                                    </svg>
                                    บันทึกข้อมูล
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default CustomerEditModal;