import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCustomerBatch, fetchEnvs } from '../api/customers';

type CustomerDraft = {
  cust_name: string;
  cust_code: string;
  project_name: string;
  cust_desc: string;
};

// EnvEntry type removed (not used) to avoid lint warning

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

  const [pmRows, setPmRows] = useState<PMRow[]>([]);
  const [pmCounter, setPmCounter] = useState(1);
  const [pmNameInput, setPmNameInput] = useState<string>('');
  const [pmYearInput, setPmYearInput] = useState<number | ''>('');
  const [pmRoundInput, setPmRoundInput] = useState<number>(1);

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

  // PM handling
  const handleCreatePmRows = (pm_name: string, pm_year: number | '', pm_round: number) => {
    if (!pm_name || !pm_year || !pm_round) {
      alert('กรุณากรอกข้อมูล PM Name, Year และ Round');
      return;
    }
    if (pm_round < 1) {
      alert('จำนวนรอบต้องไม่น้อยกว่า 1');
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

    if (selectedEnvChecks.length === 0) {
      alert('กรุณาเลือก Environment อย่างน้อย 1 รายการก่อนบันทึก');
      return;
    }

    if (pmRows.length === 0) {
      alert('กรุณากด Create PM เพื่อเพิ่ม PM Plan ก่อนบันทึก');
      return;
    }

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
        <h3 className="card-title">สร้างลูกค้าใหม่</h3>
        <p className="card-subtitle">กรอกข้อมูลลูกค้าและข้อมูลที่เกี่ยวข้อง (Env, Application, PM)</p>
      </div>

      <div className="card-body">
        {/* Details Customer */}
        <section style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>รายละเอียดลูกค้า</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">ชื่อลูกค้า <span style={{ color: '#b91c1c' }}>*</span></label>
              <input className="form-control" placeholder="ชื่อเต็มของลูกค้า" value={customer.cust_name} onChange={e => setCustomer({ ...customer, cust_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">คำย่อลูกค้า <span style={{ color: '#b91c1c' }}>*</span></label>
              <input className="form-control" placeholder="ตัวอย่าง: DDS" value={customer.cust_code} onChange={e => setCustomer({ ...customer, cust_code: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">ชื่อโครงการ</label>
              <input className="form-control" placeholder="ชื่อโครงการ (ถ้ามี)" value={customer.project_name} onChange={e => setCustomer({ ...customer, project_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">รายละเอียดเพิ่มเติม</label>
              <input className="form-control" placeholder="คำอธิบายสั้น ๆ" value={customer.cust_desc} onChange={e => setCustomer({ ...customer, cust_desc: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <button className="btn btn-primary" onClick={handleAddCustomer}>บันทึกข้อมูลลูกค้า (ขั้นตอน 1)</button>
          </div>
        </section>

        {/* Env Section (display only after add customer) */}
        <section style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>Environment (Env)</h4>
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
                      <th style={{ width: 120 }}>Actions</th>
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
                            <button className="btn btn-sm btn-danger" onClick={() => toggleEnvOption(id)}>ลบ</button>
                          </td>
                        </tr>
                      );
                    })}
                    {selectedEnvChecks.length === 0 && (
                      <tr><td colSpan={2} style={{ textAlign: 'center', padding: '1rem' }}>ยังไม่มี Env</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Application removed per request */}

        {/* PM Plan Section */}
        <section style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>PM Plan</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div className="form-group">
              <label className="form-label">ชื่อ PM / โครงการ</label>
              <input className="form-control" value={pmNameInput} onChange={e => setPmNameInput(e.target.value)} placeholder="ชื่อ PM" />
            </div>
            <div className="form-group">
              <label className="form-label">ปี PM ( เช่น 2024, 2025)</label>
              <input className="form-control" type="number" value={pmYearInput as any} onChange={e => setPmYearInput(e.target.value ? Number(e.target.value) : '')} />
            </div>
            <div className="form-group">
              <label className="form-label">รอบ (จำนวน)</label>
              <input
                className="form-control"
                type="number"
                min={1}
                value={pmRoundInput}
                onChange={e => {
                  const val = Number(e.target.value);
                  setPmRoundInput(!Number.isNaN(val) && val >= 1 ? val : 1);
                }}
              />
            </div>
          </div>
          <div>
            <button className="btn btn-primary" onClick={() => {
              handleCreatePmRows(pmNameInput, pmYearInput as number | '', pmRoundInput || 0);
              // clear inputs for convenience
              setPmNameInput(''); setPmYearInput(''); setPmRoundInput(1);
            }}>Create PM</button>
          </div>

          <div style={{ marginTop: '0.75rem' }} className="table-container">
            <table>
              <thead><tr><th>PM Name</th><th>Year</th><th>Round</th></tr></thead>
              <tbody>
                {pmRows.map(p => (
                  <tr key={p.id}><td>{p.pm_name}</td><td>{p.pm_year}</td><td>{p.round}</td></tr>
                ))}
                {pmRows.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: '1rem' }}>ยังไม่มี PM Plan</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/customer')}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={handleSaveAll}>บันทึก</button>
        </div>
      </div>
    </div>
  );
};

export default NewCustomer;
