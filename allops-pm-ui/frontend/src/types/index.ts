export interface Customer {
    id: number;
    cust_name: string;
    code: string;
    remark: string;
    created_at: Date;
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

export interface UploadPMData {
    file: File;
    customerId: number;
}