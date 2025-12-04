import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPMById } from '../api/pm';

const PMDetails: React.FC = () => {
  const params = useParams();
  const pmId = params.pmId ? Number(params.pmId) : null;
  const [pm, setPm] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      if (!pmId) return setLoading(false);
      try {
        const data = await fetchPMById(pmId);
        setPm(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pmId]);

  if (!pmId) return <div>Invalid PM ID</div>;

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">PM Details</h1>
        <p className="page-subtitle">รายละเอียด PM</p>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div>Loading...</div>
          ) : !pm ? (
            <div>PM not found</div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <h3>{pm.pm_name}</h3>
                <div><strong>Cust:</strong> {pm.cust_name} ({pm.cust_code})</div>
                <div><strong>รอบ:</strong> {pm.pm_round}</div>
                <div><strong>ปี:</strong> {pm.pm_year}</div>
                <div><strong>สถานะ:</strong> {pm.pm_status ? 'Completed' : 'Pending'}</div>
                <div><strong>วันที่สร้าง:</strong> {pm.created_at ? new Date(pm.created_at).toLocaleString('th-TH') : '-'}</div>
                <div style={{ marginTop: '1rem' }}>
                  <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PMDetails;
