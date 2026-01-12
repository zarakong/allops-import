import axios from 'axios';
import { Customer } from '../types';
import { API_BASE_URL } from './config';

export const fetchCustomers = async (): Promise<Customer[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/customers`);
    return response.data;
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
};

export const createCustomer = async (customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/customers`, customer);
    return response.data;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

export const updateCustomer = async (id: number, customer: Partial<Customer>): Promise<Customer> => {
  try {
    const response = await axios.put(`${API_BASE_URL}/api/customers/${id}`, customer);
    return response.data;
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
};

export const deleteCustomer = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/api/customers/${id}`);
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
};

export const fetchCustomerById = async (id: number): Promise<any> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/customers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching customer by id:', error);
    throw error;
  }
};

export const fetchCustomerServers = async (id: number): Promise<any[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/customers/${id}/servers`);
    return response.data;
  } catch (error) {
    console.error('Error fetching customer servers:', error);
    throw error;
  }
};

export const updateServerPaths = async (
  custId: number,
  serverId: number,
  payload: { path_app?: string | null; path_data?: string | null }
): Promise<any> => {
  try {
    const response = await axios.put(`${API_BASE_URL}/api/customers/${custId}/servers/${serverId}/paths`, payload);
    return response.data;
  } catch (error) {
    console.error('Error updating server paths:', error);
    throw error;
  }
};

export const fetchCustomerEnvs = async (id: number): Promise<Array<{ cust_id: number; env_id: number; env_name: string; server_id: number }>> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/customers/${id}/envs`);
    return response.data;
  } catch (error) {
    console.error('Error fetching customer envs:', error);
    throw error;
  }
};

export const fetchCustomerWorkspaceDetails = async (
  id: number
): Promise<Array<{ env_id: number; env_name: string; workspace_text: string | null; workspace_date: string | null }>> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/customers/${id}/workspace-details`);
    return response.data;
  } catch (error) {
    console.error('Error fetching customer workspace details:', error);
    throw error;
  }
};

export const fetchCustomerWorkspaceContentStore = async (
  id: number
): Promise<Array<{ env_id: number; env_name: string | null; cont_all_kb: number | null; alf_version_json: unknown; created_at: string | null; pm_id?: number; pm_year?: number; pm_round?: number }>> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/customers/${id}/workspace-content-store`);
    return response.data;
  } catch (error) {
    console.error('Error fetching customer content store summary:', error);
    throw error;
  }
};

export const createCustomerBatch = async (payload: any): Promise<any> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/customers/batch`, payload);
    return response.data;
  } catch (error) {
    console.error('Error creating customer batch:', error);
    throw error;
  }
};

export const fetchEnvs = async (): Promise<Array<{ id: number; env_name: string }>> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/customers/envs`);
    return response.data;
  } catch (error) {
    console.error('Error fetching envs:', error);
    throw error;
  }
};

export const createCustomerServerEnvs = async (custId: number, payload: { entries: Array<{ env_id: number; server_name: string }> }) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/customers/${custId}/server-envs`, payload);
    return response.data;
  } catch (error) {
    console.error('Error creating customer server envs:', error);
    throw error;
  }
};

export const fetchCustomerDiagram = async (custId: number): Promise<DiagramUploadResponse | null> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/customers/${custId}/diagram-project`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      // Diagram project is optional; treat missing record as null instead of failing the entire page.
      return null;
    }
    console.error('Error fetching customer diagram:', error);
    throw error;
  }
};

export const fetchCustomerDiagramImage = async (
  custId: number,
  options?: { signal?: AbortSignal; cacheBust?: number }
): Promise<Blob> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/customers/${custId}/diagram-project/image`, {
      responseType: 'blob',
      signal: options?.signal,
      params: { cacheBust: options?.cacheBust ?? Date.now() },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching customer diagram image:', error);
    throw error;
  }
};

export interface DiagramUploadResponse {
  link_id: number;
  url: string;
  created_date: string;
  file_name?: string;
  source?: string;
  mode?: 'TEST' | 'PRD';
}

export interface DiagramWebhookHealth {
  status: 'ok';
  mode: 'TEST' | 'PRD';
  url: string;
  upstreamStatus: number;
  checkedAt: string;
}

export const uploadCustomerDiagram = async (
  custId: number,
  payload: { file?: File; externalUrl?: string }
): Promise<DiagramUploadResponse> => {
  try {
    const formData = new FormData();
    if (payload.file) {
      formData.append('diagram', payload.file);
    }
    if (payload.externalUrl) {
      formData.append('externalUrl', payload.externalUrl);
    }
    const response = await axios.post(`${API_BASE_URL}/api/customers/${custId}/diagram-project`, formData);
    return response.data;
  } catch (error) {
    console.error('Error uploading customer diagram:', error);
    throw error;
  }
};

export const checkDiagramWebhookHealth = async (): Promise<DiagramWebhookHealth> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/customers/diagram-webhook-health`);
    return response.data;
  } catch (error) {
    console.error('Error checking diagram webhook health:', error);
    throw error;
  }
};

// Application management
export interface AppListItem {
  applist_id: number;
  applist_name: string;
}

export const fetchAllAppList = async (): Promise<AppListItem[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/customers/app-list`);
    return response.data;
  } catch (error) {
    console.error('Error fetching app list:', error);
    throw error;
  }
};

export const fetchServerApplications = async (custId: number, serverId: number): Promise<AppListItem[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/customers/${custId}/servers/${serverId}/applications`);
    return response.data;
  } catch (error) {
    console.error('Error fetching server applications:', error);
    throw error;
  }
};

export const addServerApplication = async (
  custId: number,
  serverId: number,
  applist_name: string
): Promise<AppListItem> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/customers/${custId}/servers/${serverId}/applications`, {
      applist_name,
    });
    return response.data;
  } catch (error) {
    console.error('Error adding server application:', error);
    throw error;
  }
};

export const removeServerApplication = async (
  custId: number,
  serverId: number,
  appId: number
): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/api/customers/${custId}/servers/${serverId}/applications/${appId}`);
  } catch (error) {
    console.error('Error removing server application:', error);
    throw error;
  }
};
