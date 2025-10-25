import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCustomerBatch, fetchEnvs } from '../api/customers';

type CustomerDraft = {
  cust_name: string;
  cust_code: string;
  project_name: string;
  cust_desc: string;
};

type EnvEntry = {
  id: number;
  env_name: string;
  customer_env_flags: string[]; // checklist values
};

type AppEntry = {
  id: number;
  env_id: number;
  app_name: string;
};

type PMRow = {
  id: number;
  pm_name: string;
  pm_year: number | '';
  round: number;
};

// env options will be fetched from backend
// const defaultEnvOptions = ['PROD', 'TEST', 'PREPROD', 'DEV', 'STAGE'];

const NewCustomer: React.FC = () => {
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<CustomerDraft>({ cust_name: '', cust_code: '', project_name: '', cust_desc: '' });
  const [customerAdded, setCustomerAdded] = useState<boolean>(false);

  const [selectedEnvChecks, setSelectedEnvChecks] = useState<number[]>([]);
  const [envOptions, setEnvOptions] = useState<Array<{ id: number; env_name: string }>>([]);

  const [apps, setApps] = useState<AppEntry[]>([]);
  const [appCounter, setAppCounter] = useState(1);
  const [appEntryEnv, setAppEntryEnv] = useState<number | ''>('');
  const [appNameInput, setAppNameInput] = useState<string>('');

  const [pmRows, setPmRows] = useState<PMRow[]>([]);
  const [pmCounter, setPmCounter] = useState(1);

  // Details Customer -> add temp
  const handleAddCustomer = () => {
    if (!customer.cust_name || !customer.cust_code) {
      alert('กรุณากรอก ชื่อลูกค้า และ คำย่อ (cust_name, cust_code)');
      return;
    }
    setCustomerAdded(true);
  };

  // Env handling
  const toggleEnvOption = (optId: number) => {
    setSelectedEnvChecks(prev => {
      const exists = prev.includes(optId);
      const next = exists ? prev.filter(x => x !== optId) : [...prev, optId];
      // if env was deselected, remove any apps associated with that env
      if (exists) {
        setApps(prevApps => prevApps.filter(a => a.env_id !== optId));
        if (appEntryEnv === optId) setAppEntryEnv('');
      }
      return next;
    });
  };

  useEffect(() => {
    // fetch env options from backend
    fetchEnvs().then(setEnvOptions).catch(err => console.error('Failed to load envs', err));
  }, []);

  // Note: envs are selected from existing envOptions and saved as customer_env on final save.
  // selectedEnvChecks contains selected env names.

  // App handling
  const handleAddApp = (envId: number, appName: string) => {
    if (!envId || !appName) {
      alert('กรุณาเลือก env และกรอกชื่อโปรแกรม');
      return;
    }
    const entry: AppEntry = { id: appCounter, env_id: envId, app_name: appName };
    setApps(prev => [...prev, entry]);
    setAppCounter(c => c + 1);
  };

  const handleRemoveApp = (id: number) => setApps(prev => prev.filter(a => a.id !== id));

  // PM handling
  const handleCreatePmRows = (pm_name: string, pm_year: number | '', pm_round: number) => {
    if (!pm_name || !pm_year || !pm_round) {
      alert('กรุณากรอกข้อมูล PM Name, Year และ Round');
      return;
    }
    const newRows: PMRow[] = Array.from({ length: pm_round }).map((_, idx) => ({
      id: pmCounter + idx,
      pm_name,
      pm_year,
      round: idx + 1,
    }));
    setPmRows(prev => [...prev, ...newRows]);
    setPmCounter(c => c + pm_round);
  };

  const handleSaveAll = () => {
    // Inline validation
    if (!customer.cust_name || !customer.cust_code) {
      alert('กรุณากรอก ชื่อลูกค้า และ คำย่อ ก่อนบันทึก');
      return;
    }

    // Confirmation
    const ok = window.confirm('ยืนยันการบันทึกข้อมูลลูกค้าและรายการที่เกี่ยวข้องหรือไม่?');
    if (!ok) return;

  const envsPayload = selectedEnvChecks.map(id => ({ env_id: id }));
  // convert apps to payload format { env_id, app_name }
  const appsPayload = apps.map(a => ({ env_id: a.env_id, app_name: a.app_name }));
  const payload = { customer, envs: envsPayload, apps: appsPayload, pmRows };

    // call backend batch endpoint
    createCustomerBatch(payload)
      .then((result) => {
        console.log('Batch create result:', result);
        alert('บันทึกสำเร็จ');
        navigate('/customer');
      })
      .catch(err => {
        console.error('Batch create error', err);
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + (err?.response?.data?.error || err.message || 'Unknown'));
      });
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">New Customer</h3>
        <p className="card-subtitle">สร้างลูกค้าใหม่ — กรอกข้อมูลทีละขั้นตอน</p>
      </div>

      <div className="card-body">
        {/* Details Customer */}
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h2>Details Customer</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label>ชื่อลูกค้า <span style={{ color: 'var(--error-500)' }}>*</span></label>
              <input value={customer.cust_name} onChange={e => setCustomer({ ...customer, cust_name: e.target.value })} />
            </div>
            <div>
              <label>คำย่อลูกค้า <span style={{ color: 'var(--error-500)' }}>*</span></label>
              <input value={customer.cust_code} onChange={e => setCustomer({ ...customer, cust_code: e.target.value })} />
            </div>
            <div>
              <label>ชื่อโครงการ</label>
              <input value={customer.project_name} onChange={e => setCustomer({ ...customer, project_name: e.target.value })} />
            </div>
            <div>
              <label>รายละเอียด อื่นๆ</label>
              <input value={customer.cust_desc} onChange={e => setCustomer({ ...customer, cust_desc: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <button className="btn btn-primary" onClick={handleAddCustomer}>add customer</button>
          </div>
        </section>

        {/* Env Section (display only after add customer) */}
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h2>Env</h2>
          {!customerAdded && <div style={{ color: 'var(--gray-500)' }}>กรุณากด "add customer" ก่อนเพื่อเริ่มเพิ่ม Env</div>}
          {customerAdded && (
            <div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {envOptions.length === 0 && <div style={{ color: 'var(--gray-500)' }}>Loading envs...</div>}
                  {envOptions.map(opt => (
                    <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.5rem' }}>
                      <input type="checkbox" value={String(opt.id)} checked={selectedEnvChecks.includes(opt.id)} onChange={() => toggleEnvOption(opt.id)} /> {opt.env_name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Env</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEnvChecks.map((id) => {
                      const opt = envOptions.find(o => o.id === id);
                      const name = opt ? opt.env_name : id;
                      return (
                        <tr key={id}>
                          <td>{name}</td>
                          <td>
                            <button className="btn btn-sm btn-danger" onClick={() => toggleEnvOption(id)}>Remove</button>
                          </td>
                        </tr>
                      );
                    })}
                    {selectedEnvChecks.length === 0 && (
                      <tr><td colSpan={2} style={{ textAlign: 'center', padding: 'var(--space-6)' }}>ยังไม่มี Env</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Application Section */}
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h2>Application</h2>
          {!customerAdded && <div style={{ color: 'var(--gray-500)' }}>กรุณากด "add customer" ก่อน</div>}
          {customerAdded && (
            <div>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <small>เลือก env ที่เพิ่มไว้เพื่อเพิ่ม Application (สามารถเพิ่มได้หลายรายการ)</small>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <select id="app-env-select" value={appEntryEnv} onChange={(e) => setAppEntryEnv(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">-- เลือก env --</option>
                  {selectedEnvChecks.map(id => {
                    const opt = envOptions.find(o => o.id === id);
                    return <option key={id} value={id}>{opt ? opt.env_name : id}</option>;
                  })}
                </select>

                <input id="app-name-input" placeholder="app_name: โปรแกรม" value={appNameInput} onChange={e => setAppNameInput(e.target.value)} />

                <button className="btn btn-secondary" onClick={() => {
                  if (!appEntryEnv) {
                    alert('กรุณาเลือก env ก่อนเพิ่ม Application');
                    return;
                  }
                  handleAddApp(appEntryEnv, appNameInput);
                  setAppNameInput('');
                }}>add app</button>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Env</th><th>Application</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {apps.map(a => {
                      const opt = envOptions.find(o => o.id === a.env_id);
                      return (<tr key={a.id}><td>{opt ? opt.env_name : a.env_id}</td><td>{a.app_name}</td><td><button className="btn btn-sm btn-danger" onClick={() => handleRemoveApp(a.id)}>Remove</button></td></tr>);
                    })}
                    {apps.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: 'var(--space-6)' }}>ยังไม่มี Application</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* PM Plan Section */}
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h2>PM Plan</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: 'var(--space-3)' }}>
            <div>
              <label>pm_name (ชื่อสัญญา/โครงการ)</label>
              <input id="pm-name" />
            </div>
            <div>
              <label>pm_year</label>
              <input id="pm-year" type="number" />
            </div>
            <div>
              <label>pm_round</label>
              <input id="pm-round" type="number" defaultValue={1} />
            </div>
          </div>
          <div>
            <button className="btn btn-primary" onClick={() => {
              const name = (document.getElementById('pm-name') as HTMLInputElement).value;
              const yearVal = (document.getElementById('pm-year') as HTMLInputElement).value;
              const roundVal = parseInt((document.getElementById('pm-round') as HTMLInputElement).value || '0', 10);
              const year = yearVal ? parseInt(yearVal, 10) : '';
              handleCreatePmRows(name, year as number | '', roundVal || 0);
            }}>Create PM Rows</button>
          </div>

          <div style={{ marginTop: 'var(--space-4)' }} className="table-container">
            <table>
              <thead><tr><th>PM Name</th><th>Year</th><th>Round</th></tr></thead>
              <tbody>
                {pmRows.map(p => (
                  <tr key={p.id}><td>{p.pm_name}</td><td>{p.pm_year}</td><td>{p.round}</td></tr>
                ))}
                {pmRows.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: 'var(--space-6)' }}>ยังไม่มี PM Plan</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/customer')}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveAll}>Save (temp)</button>
        </div>
      </div>
    </div>
  );
};

export default NewCustomer;
