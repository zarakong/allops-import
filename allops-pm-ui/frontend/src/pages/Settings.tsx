import React, { useEffect, useState } from 'react';
import { fetchN8nWebhookSettings, updateN8nWebhookSettings, N8nWebhookSettings, WebhookMode } from '../api/settings';
import './Settings.css';

const Settings: React.FC = () => {
  const [form, setForm] = useState<{ testUrl: string; prdUrl: string; mode: WebhookMode }>({
    testUrl: '',
    prdUrl: '',
    mode: 'TEST'
  });
  const [snapshot, setSnapshot] = useState<N8nWebhookSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchN8nWebhookSettings();
        setSnapshot(data);
        setForm({
          testUrl: data.testUrl || '',
          prdUrl: data.prdUrl || '',
          mode: data.mode
        });
      } catch (err) {
        console.error('Unable to load settings', err);
        setError('ไม่สามารถโหลดข้อมูลการตั้งค่าได้');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        mode: form.mode,
        testUrl: form.testUrl.trim() || null,
        prdUrl: form.prdUrl.trim() || null
      };
      const updated = await updateN8nWebhookSettings(payload);
      setSnapshot(updated);
      setForm({ testUrl: updated.testUrl || '', prdUrl: updated.prdUrl || '', mode: updated.mode });
      setMessage('บันทึกการตั้งค่าเรียบร้อยแล้ว');
    } catch (err: any) {
      const detail = err?.response?.data?.error || 'บันทึกการตั้งค่าไม่สำเร็จ';
      setError(detail);
    } finally {
      setSaving(false);
    }
  };

  const setMode = (mode: WebhookMode) => {
    setForm((prev) => ({ ...prev, mode }));
  };

  return (
    <div className="settings-page container">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">ตั้งค่า n8n webhook สำหรับการอัปโหลด Diagram</p>
      </div>

      {loading ? (
        <div className="settings-card">กำลังโหลด...</div>
      ) : (
        <div className="settings-grid">
          <section className="settings-card">
            <header className="settings-card__header">
              <div>
                <p className="settings-eyebrow">Google Drive workflow</p>
                <h2>Webhook configuration</h2>
              </div>
              <div className="mode-toggle">
                {(['TEST', 'PRD'] as WebhookMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`mode-pill ${form.mode === mode ? 'mode-pill--active' : ''}`}
                    onClick={() => setMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </header>
            <p className="settings-description">
              เลือกใช้ Test URL (n8n test) หรือ PRD URL ตามความต้องการ หากต้องการใช้งาน Production กรุณาใส่ URL ที่ระบบให้มาแล้วเลือกโหมด PRD
            </p>
            <form className="settings-form" onSubmit={handleSubmit}>
              <label className="settings-field">
                <span>Test webhook URL</span>
                <input
                  type="url"
                  name="testUrl"
                  value={form.testUrl}
                  placeholder="https://.../webhook-test/..."
                  onChange={(event) => setForm((prev) => ({ ...prev, testUrl: event.target.value }))}
                />
              </label>
              <label className="settings-field">
                <span>PRD webhook URL</span>
                <input
                  type="url"
                  name="prdUrl"
                  value={form.prdUrl}
                  placeholder="https://.../webhook/..."
                  onChange={(event) => setForm((prev) => ({ ...prev, prdUrl: event.target.value }))}
                />
              </label>

              <div className="settings-actions">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
              {message && <p className="settings-feedback settings-feedback--success">{message}</p>}
              {error && <p className="settings-feedback settings-feedback--error">{error}</p>}
            </form>
          </section>

          <section className="settings-card settings-summary">
            <header className="settings-card__header">
              <div>
                <p className="settings-eyebrow">สถานะปัจจุบัน</p>
                <h2>Webhook status</h2>
              </div>
            </header>
            <dl className="settings-summary__list">
              <div>
                <dt>โหมดที่กำลังใช้งาน</dt>
                <dd>{snapshot?.mode || 'TEST'}</dd>
              </div>
              <div>
                <dt>Active URL</dt>
                <dd>{snapshot?.activeUrl || 'ยังไม่กำหนด'}</dd>
              </div>
              <div>
                <dt>Test URL</dt>
                <dd>{snapshot?.testUrl || 'ยังไม่ระบุ'}</dd>
              </div>
              <div>
                <dt>PRD URL</dt>
                <dd>{snapshot?.prdUrl || 'ยังไม่ระบุ'}</dd>
              </div>
            </dl>
            <p className="settings-note">
              หากต้องการใช้งาน PRD โปรดระบุ PRD URL และตรวจสอบการแชร์ไฟล์จาก Google Drive ให้เปิดสิทธิ์ผู้รับลิงก์
            </p>
          </section>
        </div>
      )}
    </div>
  );
};

export default Settings;
