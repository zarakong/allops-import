import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCustomerById, fetchCustomerServers, fetchCustomerEnvs, fetchCustomerWorkspaceDetails } from '../api/customers';
import { fetchPMPlansByCustomer } from '../api/pm';
import './CustomerDetail.css';

const CustomerDetail: React.FC = () => {
  const { id } = useParams();
  const custId = id ? Number(id) : null;
  const [customer, setCustomer] = useState<any | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [customerEnvs, setCustomerEnvs] = useState<any[]>([]);
  const [workspaceDetails, setWorkspaceDetails] = useState<any[]>([]);
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

  const renderWorkspaceValue = (text: string | null | undefined): React.ReactNode => {
    if (!text || text.trim() === '') {
      return '?????';
    }
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) {
      return '?????';
    }
    return (
      <span className="workspace-version">
        {lines.map((line, idx) => (
          <React.Fragment key={`${line}-${idx}`}>
            {line}
            {idx < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </span>
    );
  };

  useEffect(() => {
    const load = async () => {
      if (!custId) return setLoading(false);
      try {
        const [cust, pm, sv, envs, workspace] = await Promise.all([
          fetchCustomerById(custId),
          fetchPMPlansByCustomer(custId),
          fetchCustomerServers(custId),
          fetchCustomerEnvs(custId),
          fetchCustomerWorkspaceDetails(custId)
        ]);
        setCustomer(cust);
        setPlans(pm || []);
        setServers(sv || []);
        setCustomerEnvs(envs || []);
        setWorkspaceDetails(workspace || []);
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
            <div className="customer-detail-grid">
              <section className="detail-card detail-card--summary">
                {customer ? (
                  <>
                    <div className="section-header">
                      <div>
                        <p className="section-eyebrow">ข้อมูลลูกค้า</p>
                        <h3 className="section-title section-title--hero">{customer.cust_name}</h3>
                      </div>
                      <span className={`status-chip ${customer.status ? 'status-chip--active' : 'status-chip--inactive'}`}>
                        {customer.status ? 'Support' : 'END Support'}
                      </span>
                    </div>
                    <dl className="summary-grid">
                      {[
                        { label: 'รหัสลูกค้า', value: customer.cust_code || '-' },
                        { label: 'รายละเอียด', value: customer.project_name || customer.cust_desc || '-' },
                        { label: 'วันที่สร้าง', value: customer.created_at ? new Date(customer.created_at).toLocaleString('th-TH') : '-' },
                        { label: 'Environment', value: customer.env_name || '-' },
                        { label: 'จำนวน PM Plans', value: plans.length },
                      ].map(row => (
                        <div key={row.label} className="summary-row">
                          <dt>{row.label}</dt>
                          <dd>{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                ) : (
                  <div>ไม่พบข้อมูลลูกค้า</div>
                )}
              </section>

              <section className="detail-card detail-card--servers">
                {(() => {
                  const serverEnvEntries = Array.isArray(customerEnvs) ? customerEnvs : [];
                  const validServerIds = new Set<number>();
                  serverEnvEntries.forEach((entry: any) => {
                    const sid = Number(entry.server_id);
                    if (sid > 0) validServerIds.add(sid);
                  });

                  const placeholderServers = serverEnvEntries
                    .filter((entry: any) => Number(entry.server_id) > 0)
                    .map((entry: any, idx: number) => ({
                      serv_id: Number(entry.server_id) || `placeholder-${idx}`,
                      server_name: entry.server_name,
                      env_name: entry.env_name,
                      env_id: entry.env_id,
                      pm_id: entry.pm_id,
                      create_at: null,
                      serv_os: '-',
                      serv_os_version: '-',
                      serv_cpu_model_name: '-',
                      serv_cpu_cores: '-',
                      serv_ram: null,
                    }));

                  const referenceServers = servers.length > 0 ? servers : placeholderServers;

                  const missingEnvCount = serverEnvEntries
                    ? serverEnvEntries.filter((e: any) =>
                        Number(e.server_id) > 0 &&
                        !referenceServers.some((s: any) => Number(s.env_id) === Number(e.env_id) && Number(s.server_id ?? s.serv_id) === Number(e.server_id))
                      ).length
                    : 0;

                  const totalServers = validServerIds.size > 0 ? validServerIds.size : referenceServers.length;
                  const parsed = referenceServers.map((s: any, idx: number) => ({
                    serv_id: s.serv_id ?? s.server_id ?? `placeholder-${idx}`,
                    hostname: (s.server_name?.trim() || s.serv_name || `server-${s.serv_id ?? s.server_id ?? idx + 1}`),
                    env_name: s.env_name || s.env_id || '-',
                    pm_id: s.pm_id,
                    create_at: s.create_at,
                    osName: s.serv_os || '-',
                    osVersion: s.serv_os_version || '-',
                    cpuModel: s.serv_cpu_model_name || '-',
                    cpuCores: s.serv_cpu_cores || '-',
                    ramDisplay: (s.serv_ram || s.serv_ram === 0) ? formatKb(Number(s.serv_ram)) : '-'
                  }));
                  const completeCount = parsed.filter((p: any) =>
                    p.hostname && p.hostname !== '' && p.osName !== '-' && p.cpuModel !== '-' && p.cpuCores !== '-' && p.ramDisplay !== '-'
                  ).length;
                  const serverTone = totalServers === 0 || missingEnvCount > 0 ? 'warn' : 'ok';

                  return (
                    <>
                      <div className="section-header">
                        <div>
                          <p className="section-eyebrow">สรุป Server</p>
                          <h4 className="section-title section-title--hero">จำนวน Server ทั้งหมด ({totalServers}), ข้อมูลครบ ({completeCount})</h4>
                        </div>
                        <div className="section-cta">
                          <span className={`metric-chip metric-chip--${serverTone}`}>{totalServers} เซิร์ฟเวอร์</span>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' }}
                            onClick={() => navigate(`/customer/${custId}/new-server`)}
                          >
                            New Server
                          </button>
                        </div>
                      </div>

                      {totalServers === 0 ? (
                        <div className="empty-block">ไม่มีข้อมูล Server</div>
                      ) : (
                        <div className="spec-wrapper">
                          <div className="table-scroll">
                            <table className="spec-table">
                              <thead>
                                <tr>
                                  <th></th>
                                  {parsed.map((p: any) => (
                                    <th key={p.serv_id}>{p.hostname}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { label: 'Server name', values: parsed.map(p => p.hostname || '-') },
                                  { label: 'Env', values: parsed.map(p => p.env_name) },
                                  { label: 'OS', values: parsed.map(p => p.osName) },
                                  { label: 'OS version', values: parsed.map(p => p.osVersion) },
                                  { label: 'CPU model name', values: parsed.map(p => p.cpuModel) },
                                  { label: 'CPU Cores', values: parsed.map(p => p.cpuCores) },
                                  { label: 'RAM', values: parsed.map(p => p.ramDisplay) },
                                  { label: 'Date data', values: parsed.map(p => (p.create_at ? new Date(p.create_at).toLocaleDateString('th-TH') : '-')) }
                                ].map(row => (
                                  <tr key={row.label}>
                                    <td>{row.label}</td>
                                    {row.values.map((v: any, idx: number) => (
                                      <td key={idx}>{v}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </section>

              <section className="detail-card detail-card--workspace" id="alfresco_cust_details">
                {(() => {
                  const envMap: Array<{ env_id: number; env_name: string }> = [];
                  const envSeen = new Set<number>();
                  const pushEnv = (env_id: number, env_name: string) => {
                    if (!envSeen.has(env_id)) {
                      envSeen.add(env_id);
                      envMap.push({ env_id, env_name });
                    }
                  };

                  (customerEnvs || []).forEach((entry: any) => {
                    const envId = Number(entry.env_id);
                    const envName = entry.env_name || '-';
                    if (envId) pushEnv(envId, envName);
                  });

                  (workspaceDetails || []).forEach((entry: any) => {
                    const envId = Number(entry.env_id);
                    const envName = entry.env_name || '-';
                    if (envId) pushEnv(envId, envName);
                  });

                  const workspaceByEnv = new Map<number, any>();
                  (workspaceDetails || []).forEach((entry: any) => {
                    const envId = Number(entry.env_id);
                    if (envId) {
                      workspaceByEnv.set(envId, entry);
                    }
                  });

                  const rows = [
                    {
                      label: 'beflex version',
                      values: envMap.map(env => renderWorkspaceValue(workspaceByEnv.get(env.env_id)?.workspace_text))
                    },
                    {
                      label: 'Date data',
                      values: envMap.map(env => workspaceByEnv.get(env.env_id)?.workspace_date || '?????')
                    }
                  ];

                  return (
                    <>
                      <div className="section-header">
                        <div>
                          <p className="section-eyebrow">beflex workspace (alfresco) details</p>
                          <h4 className="section-title">รายละเอียด version beflex workspace</h4>
                        </div>
                      </div>
                      {envMap.length === 0 ? (
                        <div className="empty-block">ไม่มีข้อมูล Environment</div>
                      ) : (
                        <div className="table-scroll">
                          <table className="spec-table workspace-table">
                            <thead>
                              <tr>
                                <th>TITLE/ENV</th>
                                {envMap.map(env => (
                                  <th key={env.env_id}>{env.env_name}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map(row => (
                                <tr key={row.label}>
                                  <td>{row.label}</td>
                                  {row.values.map((value, idx) => (
                                    <td key={`${row.label}-${envMap[idx].env_id}`}>{value}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  );
                })()}
              </section>

              <section className="detail-card detail-card--pm">
                <div className="section-header">
                  <div>
                    <p className="section-eyebrow">แผนการบำรุงรักษา</p>
                    <h4 className="section-title section-title--hero">รายการ PM Plans ({plans.length})</h4>
                  </div>
                </div>
                {plans.length === 0 ? (
                  <div className="empty-block">ไม่มีรายการ PM</div>
                ) : (
                  <div className="table-scroll">
                    <table className="pm-table">
                      <thead>
                        <tr>
                          <th>PM ID</th>
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
                            <td>{p.pm_id}</td>
                            <td>{p.pm_name}</td>
                            <td>{p.pm_year}</td>
                            <td>{p.pm_round}</td>
                            <td>{p.pm_created_at ? new Date(p.pm_created_at).toLocaleString('th-TH') : '-'}</td>
                            <td>
                              <span className={`status-pill ${p.status ? 'status-pill--success' : 'status-pill--pending'}`}>
                                {p.status ? 'Completed' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
