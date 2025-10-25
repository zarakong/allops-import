import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { fetchCustomerById } from '../api/customers';
import { fetchPMPlansByCustomer } from '../api/pm';

interface Props {
  isOpen: boolean;
  onRequestClose: () => void;
  customerId: number | null;
}

const CustomerDetailsModal: React.FC<Props> = ({ isOpen, onRequestClose, customerId }) => {
  const [customer, setCustomer] = useState<any | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!customerId) return;
      setLoading(true);
      try {
        const [cust, pm] = await Promise.all([
          fetchCustomerById(customerId),
          fetchPMPlansByCustomer(customerId)
        ]);
        setCustomer(cust);
        setPlans(pm || []);
      } catch (err) {
        console.error('Error loading customer details', err);
      } finally {
        setLoading(false);
      }
    };
    if (isOpen) load();
  }, [isOpen, customerId]);

  return (
    <Modal isOpen={isOpen} onClose={onRequestClose} title={customer ? `Customer: ${customer.cust_name}` : 'Customer details'} size="lg">
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {customer ? (
            <div>
              <h4>ข้อมูลลูกค้า</h4>
              <div><strong>ชื่อ:</strong> {customer.cust_name}</div>
              <div><strong>รหัส:</strong> {customer.cust_code}</div>
              <div><strong>รายละเอียด:</strong> {customer.project_name || customer.cust_desc || '-'}</div>
              <div><strong>วันที่สร้าง:</strong> {customer.created_at ? new Date(customer.created_at).toLocaleString('th-TH') : '-'}</div>
              <div><strong>Env:</strong> {customer.env_name || '-'}</div>
              <div style={{ marginTop: '0.5rem' }}>
                <strong>สถานะ:</strong>{' '}
                <span style={{ color: customer.status ? 'green' : 'red', fontWeight: 600 }}>
                  {customer.status ? 'Support' : 'END Support'}
                </span>
              </div>
            </div>
          ) : (
            <div>ไม่มีข้อมูลลูกค้า</div>
          )}

          <div>
            <h4>รายการ PM Plans ({plans.length})</h4>
            {plans.length === 0 ? (
              <div>ไม่มีรายการ PM</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>PM ID</th>
                    <th>ชื่อ</th>
                    <th>ปี</th>
                    <th>รอบ</th>
                    <th>วันที่ PM</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map(p => (
                    <tr key={p.pm_id}>
                      <td style={{ padding: '0.25rem 0' }}>{p.pm_id}</td>
                      <td>{p.pm_name}</td>
                      <td>{p.pm_year}</td>
                      <td>{p.pm_round}</td>
                      <td>{p.pm_created_at ? new Date(p.pm_created_at).toLocaleString('th-TH') : '-'}</td>
                      <td style={{ color: p.status ? 'green' : 'red', fontWeight: 600 }}>{p.status ? 'Completed' : 'Pending'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CustomerDetailsModal;
