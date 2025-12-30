import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchCustomerEnvs, createCustomerServerEnvs } from '../api/customers';

const NewServer: React.FC = () => {
  const { id } = useParams();
  const custId = id ? Number(id) : null;
  const navigate = useNavigate();

  const [envs, setEnvs] = useState<Array<{ env_id: number; env_name: string }>>([]);
  const [selectedEnv, setSelectedEnv] = useState<number | ''>('');
  const [serverName, setServerName] = useState<string>('');
  const [list, setList] = useState<Array<{ env_id: number; server_name: string }>>([]);

  useEffect(() => {
    if (!custId) return;
    fetchCustomerEnvs(custId)
      .then(rows => {
        // rows: { cust_id, env_id, env_name, server_id }
        const deduped = new Map<number, string>();
        rows.forEach((r: any) => {
          const envId = Number(r.env_id);
          if (!envId || deduped.has(envId)) {
            return;
          }
          deduped.set(envId, r.env_name);
        });
        setEnvs(Array.from(deduped.entries()).map(([env_id, env_name]) => ({ env_id, env_name })));
      })
      .catch(err => console.error(err));
  }, [custId]);

  const handleAdd = () => {
    if (!selectedEnv || !serverName) {
      alert('เลือก Env และกรอกชื่อ Server ก่อนกดเพิ่ม');
      return;
    }
    setList(prev => [...prev, { env_id: Number(selectedEnv), server_name: serverName }]);
    setServerName('');
  };

  const handleRemove = (idx: number) => setList(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!custId) return;
    if (list.length === 0) {
      alert('ยังไม่มีรายการที่ต้องบันทึก');
      return;
    }
    try {
      await createCustomerServerEnvs(custId, { entries: list });
      alert('บันทึกสำเร็จ');
      navigate(`/customer/${custId}`);
    } catch (err) {
      console.error(err);
      alert('บันทึกไม่สำเร็จ');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">New Server</h3>
        <p className="card-subtitle">เพิ่ม Server ใหม่สำหรับลูกค้า</p>
      </div>
      <div className="card-body">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
          <select value={selectedEnv} onChange={e => setSelectedEnv(e.target.value ? Number(e.target.value) : '')} className="form-control">
            <option value="">-- เลือก Env --</option>
            {envs.map(ev => <option key={ev.env_id} value={ev.env_id}>{ev.env_name}</option>)}
          </select>
          <input className="form-control" placeholder="Server name" value={serverName} onChange={e => setServerName(e.target.value)} />
          <button className="btn btn-secondary" onClick={handleAdd}>Add</button>
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>Env</th><th>Server name</th><th>Actions</th></tr></thead>
            <tbody>
              {list.map((r, i) => {
                const env = envs.find(e => e.env_id === r.env_id);
                return (
                  <tr key={i}><td>{env ? env.env_name : r.env_id}</td><td>{r.server_name}</td><td><button className="btn btn-sm btn-danger" onClick={() => handleRemove(i)}>ลบ</button></td></tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: '1rem' }}>ยังไม่มีรายการ</td></tr>}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default NewServer;
