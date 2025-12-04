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

export const fetchPMById = async (id: number): Promise<any> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/pm/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching PM by id:', error);
    throw error;
  }
};

export const fetchPmRound = async (pmId: number, envId: number, serverId: number): Promise<any[]> => {
  try {
    const url = `${API_BASE_URL}/api/pm/round`;
    const resp = await axios.get(url, { params: { pm_id: pmId, env_id: envId, server_id: serverId } });
    return resp.data;
  } catch (error) {
    console.error('Error fetching pm_round by keys:', error);
    throw error;
  }
};

export const fetchImportHeader = async (opts: { cust_id?: number; pm_id?: number }): Promise<any> => {
  try {
    const url = `${API_BASE_URL}/api/pm/import/header`;
    const resp = await axios.get(url, { params: opts });
    return resp.data;
  } catch (error) {
    console.error('Error fetching import header:', error);
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

export const importPM = async (payload: any): Promise<any> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/pm/import`, payload, { headers: { 'Content-Type': 'application/json' } });
    return response.data;
  } catch (error) {
    console.error('Error importing pm data:', error);
    throw error;
  }
};

export const fetchAlfrescoApiResponses = async (pmId: number): Promise<any[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/pm/${pmId}/alfresco-api`);
    return response.data;
  } catch (error) {
    console.error('Error fetching Alfresco API responses:', error);
    throw error;
  }
};

export const fetchAppContentSizing = async (pmId: number): Promise<any[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/pm/${pmId}/app-content-sizing`);
    return response.data;
  } catch (error) {
    console.error('Error fetching application content sizing:', error);
    throw error;
  }
};

export const fetchAppOtherApiResponses = async (pmId: number): Promise<any[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/pm/${pmId}/app-responses`);
    return response.data;
  } catch (error) {
    console.error('Error fetching application other API responses:', error);
    throw error;
  }
};

export const importPMData = async (pmId: number, envId: number, serverId: number, custId: number, jsonData: any): Promise<any> => {
  try {
    const payload = {
      ...jsonData,
      metadata: { pm_id: pmId, env_id: envId, server_id: serverId, cust_id: custId }
    };
    const response = await axios.post(`${API_BASE_URL}/api/pm/import/data`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error importing PM data:', error);
    throw error;
  }
};

export const importAlfrescoApiData = async (pmId: number, custCode: string, jsonData: any[]): Promise<any> => {
  try {
    const payload = {
      pm_id: pmId,
      cust_code: custCode,
      jsonData
    };
    const response = await axios.post(`${API_BASE_URL}/api/pm/import/alfresco-api`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error importing Alfresco API data:', error);
    throw error;
  }
};

const api = {
  fetchPMPlansByCustomer,
  fetchPMPlans,
  fetchPMById,
  fetchCustomerById,
  fetchPmRound,
  fetchImportHeader,
  createPMPlan,
  updatePMPlan,
  deletePMPlan,
  importPM,
  fetchAlfrescoApiResponses,
  fetchAppContentSizing,
  fetchAppOtherApiResponses,
  importPMData,
  importAlfrescoApiData
};

export default api;
