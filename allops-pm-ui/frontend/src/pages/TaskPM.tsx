import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPMPlansByCustomer, fetchCustomerById } from '../api/pm';
import PMPlanModal from '../components/PMPlanModal';

const TaskPM: React.FC = () => {
    const params = useParams();
    const custId = params.custId ? Number(params.custId) : null;
    const [plans, setPlans] = useState<any[]>([]);
    const [customer, setCustomer] = useState<any | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchInputCustomer, setSearchInputCustomer] = useState<string>('');
    const [searchTermCustomer, setSearchTermCustomer] = useState<string>('');
    const [searchInputYear, setSearchInputYear] = useState<string>('');
    const [searchTermYear, setSearchTermYear] = useState<string>('');
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [selectedPlan, setSelectedPlan] = useState<any | null>(null);

    useEffect(() => {
        const load = async () => {
                try {
                    if (custId) {
                        // load plans for specific customer and customer details
                        const [rows, cust] = await Promise.all([
                            fetchPMPlansByCustomer(custId, { q: searchTermCustomer, pm_year: searchTermYear }),
                            fetchCustomerById(custId)
                        ]);
                        console.log('PM plans rows (by customer):', rows);
                        setPlans(rows);
                        setCustomer(cust);
                    } else {
                        // global PM Plan page: fetch by q and pm_year; backend defaults pm_year to current year
                        // use the global endpoint
                        // lazy-load using new fetchPMPlans API
                        const { fetchPMPlans } = await import('../api/pm');
                        const rows = await fetchPMPlans({ q: searchTermCustomer, pm_year: searchTermYear });
                        console.log('PM plans rows (global):', rows);
                        setPlans(rows);
                        setCustomer(null);
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
        load();
    }, [custId, searchTermCustomer, searchTermYear]);

    const handleEdit = (pmId: number) => {
        const plan = plans.find(p => Number(p.pm_id) === Number(pmId));
        setSelectedPlan(plan || null);
        setModalOpen(true);
    };

    const handleSaved = (savedPlan: any) => {
        // refresh list by re-fetching (simple approach)
        if (custId) {
            fetchPMPlansByCustomer(custId, { q: searchTermCustomer, pm_year: searchTermYear })
              .then(rows => setPlans(rows))
              .catch(err => console.error(err));
        }
    };

    return (
        <div className="container">
            <div className="page-header">
                <h1 className="page-title">PM Plan</h1>
                <p className="page-subtitle">รายการ PM Plan ของลูกค้า {customer ? customer.cust_name : (custId ? `#${custId}` : '')}</p>
            </div>

            <div className="card">
                <div className="card-body">
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="text"
                                placeholder="ค้นหา ชื่อหรือรหัสลูกค้า"
                                value={searchInputCustomer}
                                onChange={(e) => setSearchInputCustomer(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { setSearchTermCustomer(searchInputCustomer); setSearchTermYear(searchInputYear); } }}
                            />
                            <input
                                type="text"
                                placeholder="ปี PM (เช่น 2025)"
                                value={searchInputYear}
                                onChange={(e) => setSearchInputYear(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { setSearchTermCustomer(searchInputCustomer); setSearchTermYear(searchInputYear); } }}
                            />
                            <button className="btn btn-primary" onClick={() => { setSearchTermCustomer(searchInputCustomer); setSearchTermYear(searchInputYear); }}>
                                ค้นหา
                            </button>
                        </div>
                        {/* Hint: when user searches but doesn't select year, show message */}
                        {(searchTermCustomer && !searchTermYear) && (
                            <div style={{ marginLeft: '0.5rem', color: '#6c757d' }}>
                                แสดงผลจากทุกปี — เลือกปีเพื่อกรองเฉพาะปีนั้น
                            </div>
                        )}
                        <PMPlanModal isOpen={modalOpen} onRequestClose={() => setModalOpen(false)} plan={selectedPlan} onSaved={handleSaved} />
                    </div>
                    {loading ? (
                        <div>Loading...</div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Action</th>
                                        <th>Cust_code</th>
                                        <th>ชื่อโครงการ</th>
                                        <th>รอบ PM</th>
                                        <th>ปี PM</th>
                                        <th>วันที่ PM</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plans.length === 0 ? (
                                        <tr><td colSpan={7}>No PM plans</td></tr>
                                    ) : (
                                        plans.map(plan => (
                                            <tr key={plan.pm_id}>
                                                <td>
                                                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(plan.pm_id)}>
                                                        ✎
                                                    </button>
                                                </td>
                                                <td>{plan.cust_code || customer?.cust_code || '-'}</td>
                                                <td>{plan.pm_name}</td>
                                                <td>{plan.pm_round}</td>
                                                <td>{plan.pm_year}</td>
                                                <td>{plan.pm_created_at ? new Date(plan.pm_created_at).toLocaleDateString('th-TH') : ''}</td>
                                                <td>
                                                    <span className={`badge ${plan.status === true ? 'badge-info' : 'badge-warning'}`}>
                                                        {plan.status === true ? 'เสร็จสิ้น' : 'รอ'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskPM;
