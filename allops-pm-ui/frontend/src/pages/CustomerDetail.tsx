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

  // Helper: render JSON value (primitive, object, array) as nested tables
  const renderJsonValue = (val: any): JSX.Element => {
    const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
    const cellStyle: React.CSSProperties = { padding: '0.25rem 0', verticalAlign: 'top' };

    if (val === null) return <span>null</span>;
    if (Array.isArray(val)) {
      // render array: if array of objects, render each item as its own subtable
      return (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {val.map((item, idx) => (
            <div key={idx} className="card" style={{ padding: '0.5rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>#{idx + 1}</div>
              {typeof item === 'object' && item !== null ? (
                <div>{renderJsonValue(item)}</div>
              ) : (
                <div>{String(item)}</div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (typeof val === 'object') {
      return (
        <table style={tableStyle}>
          <tbody>
            {Object.entries(val).map(([k, v]) => (
              <tr key={k}>
                <td style={{ ...cellStyle, width: '30%', fontWeight: 600 }}>{k}</td>
                <td style={cellStyle}>{renderJsonValue(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // primitive
    return <span>{String(val)}</span>;
  };

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

  const formatSizePair = (total_kb: any, used_kb: any, use_percent?: any) => {
    if (!total_kb && !used_kb) return '0/0';
    const total = total_kb ? Number(total_kb) : 0;
    const used = used_kb ? Number(used_kb) : 0;
    const totalStr = formatKb(total);
    const usedStr = formatKb(used);
    const percent = use_percent ? String(use_percent) : (total > 0 ? `${Math.round((used / total) * 100)}%` : '0%');
    return `${totalStr}/${usedStr} (${percent})`;
  };

  // Parse server_spec_json into normalized object (reuse parsing logic)
  const parseServerSpec = (s: any) => {
    if (!s || !s.server_spec_json) return null;
    try {
      const raw = String(s.server_spec_json).trim();
      let candidate = raw;
      if (!raw.startsWith('{')) {
        const i = raw.indexOf('{');
        const j = raw.lastIndexOf('}');
        if (i !== -1 && j !== -1 && j > i) candidate = raw.slice(i, j + 1);
      }
      let spec = JSON.parse(candidate);
      if (spec && spec.server_spec) spec = spec.server_spec;
      return spec;
    } catch (e) {
      return null;
    }
  };

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
                    // prepare parsed specs and hostnames
                    const parsed = servers.map((s: any) => ({
                      serv_id: s.serv_id,
                      hostname: ((): string => {
                        try {
                          const sp = parseServerSpec(s);
                          return sp && sp.hostname ? String(sp.hostname) : `server-${s.serv_id}`;
                        } catch (e) { return `server-${s.serv_id}`; }
                      })(),
                      env_name: s.env_name || s.env_id,
                      pm_id: s.pm_id,
                      create_at: s.create_at,
                      spec: parseServerSpec(s)
                    }));

                    // rows for spec summary
                    const specRows: { label: string; values: any[] }[] = [
                      { label: 'hostname', values: parsed.map(p => p.hostname) },
                        { label: 'env', values: parsed.map(p => p.env_name) },
                      { label: 'OS', values: parsed.map(p => (p.spec && p.spec.os && p.spec.os.name) ? p.spec.os.name : '-') },
                      { label: 'OS version', values: parsed.map(p => (p.spec && p.spec.os && p.spec.os.version) ? p.spec.os.version : '-') },
                      { label: 'cpu model name', values: parsed.map(p => (p.spec && p.spec.cpu_model_name) ? p.spec.cpu_model_name : '-') },
                      { label: 'CPU Cores', values: parsed.map(p => (p.spec && p.spec.cpu && p.spec.cpu.cores) ? p.spec.cpu.cores : '-') },
                      { label: 'RAM', values: parsed.map(p => (p.spec && p.spec.memory && p.spec.memory.total_kb) ? formatKb(p.spec.memory.total_kb) : '-') },
                      { label: 'Date data', values: parsed.map(p => (p.spec && p.spec.datecheck) ? String(p.spec.datecheck) : (p.create_at ? new Date(p.create_at).toLocaleDateString('th-TH') : '-')) }
                    ];

                    // mounts to show
                    const mounts = ['/run', '/', '/dev/shm', '/run/lock', '/run/user/1000'];

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

                        <div>
                          <h5>Server details (Hard disk)</h5>
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
                              {mounts.map(m => (
                                <tr key={m}>
                                  <td style={{ fontWeight: 700, padding: '0.25rem 0' }}>{m}</td>
                                  {parsed.map((p, idx) => {
                                    const diskArr = p.spec && Array.isArray(p.spec.disk) ? p.spec.disk : [];
                                    const entry = diskArr.find((d: any) => d.mount === m);
                                    if (!entry) return <td key={idx}>-</td>;
                                    return <td key={idx}>{formatSizePair(entry.size_kb, entry.used_kb, entry.use_percent)}</td>;
                                  })}
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
