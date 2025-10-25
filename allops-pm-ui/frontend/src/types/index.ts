export interface Customer {
    id: number;
    cust_name: string;
    cust_code: string;
    project_name: string;
    created_at: Date;
    cust_desc: string;
    status: boolean;
}

export interface PMPlan {
    id: number;
    customerId: number;
    planDetails: string;
    scheduledDate: Date;
}

export interface Report {
    id: number;
    reportDate: Date;
    details: string;
}

export type ReportType = Report;

export interface UploadPMData {
    file: File;
    customerId: number;
}