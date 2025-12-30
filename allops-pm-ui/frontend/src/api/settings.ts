import axios from 'axios';
import { API_BASE_URL } from './config';

export type WebhookMode = 'TEST' | 'PRD';

export interface N8nWebhookSettings {
  mode: WebhookMode;
  testUrl: string | null;
  prdUrl: string | null;
  activeUrl: string | null;
}

export const fetchN8nWebhookSettings = async (): Promise<N8nWebhookSettings> => {
  const response = await axios.get(`${API_BASE_URL}/api/settings/n8n-webhook`);
  return response.data;
};

export const updateN8nWebhookSettings = async (payload: Partial<N8nWebhookSettings>): Promise<N8nWebhookSettings> => {
  const response = await axios.put(`${API_BASE_URL}/api/settings/n8n-webhook`, payload);
  return response.data;
};
