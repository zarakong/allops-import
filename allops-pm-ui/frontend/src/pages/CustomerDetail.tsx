import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCustomerById, fetchCustomerServers } from '../api/customers';
import { fetchPMPlansByCustomer } from '../api/pm';

const CustomerDetail: React.FC = () => {
  const { id } = useParams();
  const custId = id ? Number(id) : null;
  const [customer, setCustomer] = useState<any | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Helper: format kilobytes into human readable string
  const formatKb = (kb: number | null | undefined) => {
    if (kb === null || kb === undefined || isNaN(Number(kb))) return '0';
    const k = Number(kb);
    const mb = k / 1024;
    const gb = mb / 1024;
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${k.toFixed(0)} KB`;
  };

  // We no longer parse server_spec_json; prefer structured columns on server table.

  useEffect(() => {
    const load = async () => {
      if (!custId) return setLoading(false);
      try {
        const [cust, pm, sv] = await Promise.all([
          fetchCustomerById(custId),
          fetchPMPlansByCustomer(custId),
          fetchCustomerServers(custId)
        ]);
        setCustomer(cust);
        setPlans(pm || []);
        setServers(sv || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [custId]);

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Customer detail</h1>
        <p className="page-subtitle">รายละเอียดของลูกค้า</p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/customer')}>
          ← ย้อนกลับ
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {customer ? (
                <div>
                  <h3>{customer.cust_name}</h3>
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
                <div>ไม่พบข้อมูลลูกค้า</div>
              )}

              <div>
                <h4>Server details ({servers.length})</h4>
                {servers.length === 0 ? (
                  <div>ไม่มีข้อมูล Server</div>
                ) : (
                  (() => {
                    // prepare parsed specs using structured columns
                    const parsed = servers.map((s: any) => ({
                      serv_id: s.serv_id,
                      hostname: s.server_name?.trim() || s.serv_name || `server-${s.serv_id}`,
                      env_name: s.env_name || s.env_id || '-',
                      pm_id: s.pm_id,
                      create_at: s.create_at,
                      osName: s.serv_os || '-',
                      osVersion: s.serv_os_version || '-',
                      cpuModel: s.serv_cpu_model_name || '-',
                      cpuCores: s.serv_cpu_cores || '-',
                      // serv_ram stored in KB -> format appropriately (KB -> MB/GB)
                      ramDisplay: (s.serv_ram || s.serv_ram === 0) ? formatKb(Number(s.serv_ram)) : '-'
                    }));

                    // rows for spec summary
                    const specRows: { label: string; values: any[] }[] = [
                      { label: 'hostname', values: parsed.map(p => p.hostname) },
                      { label: 'env', values: parsed.map(p => p.env_name) },
                      { label: 'OS', values: parsed.map(p => p.osName) },
                      { label: 'OS version', values: parsed.map(p => p.osVersion) },
                      { label: 'cpu model name', values: parsed.map(p => p.cpuModel) },
                      { label: 'CPU Cores', values: parsed.map(p => p.cpuCores) },
                      { label: 'RAM', values: parsed.map(p => p.ramDisplay) },
                      { label: 'Date data', values: parsed.map(p => (p.create_at ? new Date(p.create_at).toLocaleDateString('th-TH') : '-')) }
                    ];

                    return (
                      <div style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                          <h5>Server details (Server spec)</h5>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left', width: '220px' }}></th>
                                {parsed.map(p => (
                                  <th key={p.serv_id} style={{ textAlign: 'left' }}>{p.hostname}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {specRows.map(r => (
                                <tr key={r.label}>
                                  <td style={{ fontWeight: 700, padding: '0.25rem 0' }}>{r.label}</td>
                                  {r.values.map((v, i) => (
                                    <td key={i} style={{ padding: '0.25rem 0' }}>{v}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

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
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
