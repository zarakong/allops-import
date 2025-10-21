import React, { useEffect, useState } from 'react';
import { fetchReports } from '../api/reports'; // Assume this is a function to fetch reports from the backend
import { ReportType } from '../types'; // Assume this is the type for reports

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
            } finally {
                setLoading(false);
            }
        };

        loadReports();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div>
            <h1>Reports</h1>
            <table>
                <thead>
                    <tr>
                        <th>Action</th>
                        <th>Report Name</th>
                        <th>Description</th>
                        <th>Date Created</th>
                    </tr>
                </thead>
                <tbody>
                    {reports.map((report) => (
                        <tr key={report.id}>
                            <td>
                                <button>Edit</button>
                                <button>View</button>
                            </td>
                            <td>{report.name}</td>
                            <td>{report.description}</td>
                            <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Report;