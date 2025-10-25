import React, { useEffect, useState } from 'react';
import { fetchReports } from '../api/reports';
import { ReportType } from '../types';

// SVG Icons
const ReportIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const TaskIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const TrendUpIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  subtitle?: string;
}> = ({ title, value, icon, color, subtitle }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    purple: 'text-purple-600 bg-purple-100',
  };

  return (
    <div className="card">
      <div className="card-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--gray-600)' }}>{title}</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: '700', color: 'var(--gray-900)' }}>
              {value}
            </p>
            {subtitle && (
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
};

const Report: React.FC = () => {
    const [reports, setReports] = useState<ReportType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadReports = async () => {
            try {
                const data = await fetchReports();
                setReports(data);
            } catch (err) {
                setError('Failed to fetch reports');
                // For demo purposes, create some mock data
                setReports([
                    { id: 1, reportDate: new Date(), details: 'ตรวจสอบเครื่องจักรประจำเดือน' },
                    { id: 2, reportDate: new Date(), details: 'รายงานการบำรุงรักษาเครื่อง A1' },
                    { id: 3, reportDate: new Date(), details: 'ตรวจสอบระบบไฟฟ้า' },
                ]);
            } finally {
                setLoading(false);
            }
        };

        loadReports();
    }, []);

    if (loading) {
        return (
            <div className="container">
                <div className="card">
                    <div className="card-body">
                        <div className="loading">
                            <div className="spinner"></div>
                            กำลังโหลดข้อมูลรายงาน...
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="page-header">
                <h1 className="page-title">แดชบอร์ด</h1>
                <p className="page-subtitle">
                    ภาพรวมการดำเนินงานและรายงานต่างๆ
                </p>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
                <StatCard
                    title="ลูกค้าทั้งหมด"
                    value="24"
                    icon={<UserIcon />}
                    color="blue"
                    subtitle="เพิ่มขึ้น 12% จากเดือนที่แล้ว"
                />
                <StatCard
                    title="งาน PM ที่เสร็จแล้ว"
                    value="86"
                    icon={<TaskIcon />}
                    color="green"
                    subtitle="95% ของเป้าหมายเดือนนี้"
                />
                <StatCard
                    title="รายงานในเดือนนี้"
                    value={reports.length}
                    icon={<ReportIcon />}
                    color="yellow"
                    subtitle="รอการตรวจสอบ 3 รายการ"
                />
                <StatCard
                    title="ประสิทธิภาพ"
                    value="94%"
                    icon={<TrendUpIcon />}
                    color="purple"
                    subtitle="เพิ่มขึ้น 2% จากเดือนที่แล้ว"
                />
            </div>

            {/* Recent Reports */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">รายงานล่าสุด</h3>
                    <p className="card-subtitle">รายงานการบำรุงรักษาและตรวจสอบ</p>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    {error && (
                        <div style={{ padding: 'var(--space-4)', color: 'var(--error-600)', backgroundColor: 'var(--error-50)', borderRadius: 'var(--radius-md)', margin: 'var(--space-4)' }}>
                            เกิดข้อผิดพลาด: {error} (แสดงข้อมูลตัวอย่าง)
                        </div>
                    )}
                    
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>การจัดการ</th>
                                    <th>รหัสรายงาน</th>
                                    <th>รายละเอียด</th>
                                    <th>วันที่รายงาน</th>
                                    <th>สถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
                                            <div style={{ color: 'var(--gray-500)' }}>
                                                ยังไม่มีรายงาน
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    reports.map((report) => (
                                        <tr key={report.id}>
                                            <td>
                                                <div className="table-actions">
                                                    <button className="btn btn-sm btn-secondary">
                                                        แก้ไข
                                                    </button>
                                                    <button className="btn btn-sm btn-primary">
                                                        ดูรายละเอียด
                                                    </button>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge badge-info">RPT-{String(report.id).padStart(4, '0')}</span>
                                            </td>
                                            <td>{report.details}</td>
                                            <td>{new Date(report.reportDate).toLocaleDateString('th-TH')}</td>
                                            <td>
                                                <span className="badge badge-success">เสร็จสิ้น</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Report;