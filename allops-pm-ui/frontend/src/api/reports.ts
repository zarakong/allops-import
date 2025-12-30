import axios from 'axios';
import { ReportType } from '../types';
import { API_BASE_URL } from './config';

export const fetchReports = async (): Promise<ReportType[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/reports`);
    return response.data;
  } catch (error) {
    console.error('Error fetching reports:', error);
    throw error;
  }
};

export const createReport = async (report: Omit<ReportType, 'id'>): Promise<ReportType> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/reports`, report);
    return response.data;
  } catch (error) {
    console.error('Error creating report:', error);
    throw error;
  }
};

export const deleteReport = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/api/reports/${id}`);
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
};