import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { createPMPlan, updatePMPlan } from '../api/pm';

interface PMPlanModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  plan: any | null;
  onSaved: (plan: any) => void;
}

const PMPlanModal: React.FC<PMPlanModalProps> = ({ isOpen, onRequestClose, plan, onSaved }) => {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(plan ? { ...plan } : { pm_name: '', pm_round: 1, pm_year: '', remark: '' });
  }, [plan]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let res;
      if (form.pm_id) {
        res = await updatePMPlan(form.pm_id, form);
      } else {
        res = await createPMPlan(form);
      }
      onSaved(res);
      onRequestClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onRequestClose} title={form?.pm_id ? 'Edit PM Plan' : 'New PM Plan'} size="md">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>ชื่อโครงการ</label>
          <input name="pm_name" value={form.pm_name || ''} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>รอบ PM</label>
          <input name="pm_round" type="number" value={form.pm_round || 1} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>ปี PM</label>
          <input name="pm_year" value={form.pm_year || ''} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>รายละเอียด</label>
          <textarea name="remark" value={form.remark || ''} onChange={handleChange} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onRequestClose} disabled={saving}>ยกเลิก</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        </div>
      </form>
    </Modal>
  );
};

export default PMPlanModal;
