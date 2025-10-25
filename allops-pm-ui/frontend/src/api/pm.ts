import axios from 'axios';
import { } from '../types';

const API_BASE_URL = 'http://localhost:5000';

export const fetchPMPlansByCustomer = async (custId: number, opts?: { q?: string; pm_year?: string }): Promise<any[]> => {
  try {
    const params: any = {};
    if (opts?.q) params.q = opts.q;
    if (opts?.pm_year) params.pm_year = opts.pm_year;
    const url = `${API_BASE_URL}/api/customers/${custId}/pm-plans`;
    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching pm plans:', error);
    throw error;
  }
};

export const fetchPMPlans = async (opts?: { q?: string; pm_year?: string; cust_id?: number; all?: boolean }): Promise<any[]> => {
  try {
    const params: any = {};
    if (opts?.q) params.q = opts.q;
    if (opts?.pm_year) params.pm_year = opts.pm_year;
    if (opts?.cust_id) params.cust_id = opts.cust_id;
    if (opts?.all) params.all = opts.all;
    const url = `${API_BASE_URL}/api/pm`;
    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching pm plans (global):', error);
    throw error;
  }
};

export const fetchCustomerById = async (custId: number): Promise<any> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/customers/${custId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching customer by id:', error);
    throw error;
  }
};

export const createPMPlan = async (plan: any): Promise<any> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/pm`, plan);
    return response.data;
  } catch (error) {
    console.error('Error creating pm plan:', error);
    throw error;
  }
};

export const updatePMPlan = async (id: number, plan: any): Promise<any> => {
  try {
    const response = await axios.put(`${API_BASE_URL}/api/pm/${id}`, plan);
    return response.data;
  } catch (error) {
    console.error('Error updating pm plan:', error);
    throw error;
  }
};

export const deletePMPlan = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/api/pm/${id}`);
  } catch (error) {
    console.error('Error deleting pm plan:', error);
    throw error;
  }
};

export default {};
