import axios from 'axios';
import { Customer } from '../types';

const API_BASE_URL = 'http://localhost:5000';

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