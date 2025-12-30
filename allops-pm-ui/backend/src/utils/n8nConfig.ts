import { query } from '../db';
import logger from './logger';

export type WebhookMode = 'TEST' | 'PRD';

export interface N8nWebhookConfig {
  mode: WebhookMode;
  testUrl: string | null;
  prdUrl: string | null;
  activeUrl: string | null;
}

const SETTING_KEYS = {
  mode: 'n8n_webhook_mode',
  testUrl: 'n8n_webhook_test_url',
  prdUrl: 'n8n_webhook_prd_url',
} as const;

const DEFAULTS = {
  mode: (process.env.N8N_WEBHOOK_MODE === 'TEST' ? 'TEST' : 'PRD') as WebhookMode,
  testUrl:
    process.env.N8N_WEBHOOK_TEST_URL ||
    'https://beflexdemo.bcircle.co.th/n8n/webhook-test/01fe257e-5afa-481e-8dc7-8061fb8468c3',
  prdUrl:
    process.env.N8N_WEBHOOK_PRD_URL ||
    'https://beflexdemo.bcircle.co.th/n8n/webhook/01fe257e-5afa-481e-8dc7-8061fb8468c3',
};

const SETTING_LOOKUP_ORDER = Object.values(SETTING_KEYS);

const fetchSettingSnapshot = async (): Promise<Record<string, string>> => {
  try {
    const result = await query(
      `SELECT setting_key, setting_value
       FROM public.app_settings
       WHERE setting_key = ANY($1)`,
      [SETTING_LOOKUP_ORDER]
    );
    return (result.rows || []).reduce<Record<string, string>>((acc: Record<string, string>, row: any) => {
      if (row.setting_key && row.setting_value) {
        acc[row.setting_key] = row.setting_value;
      }
      return acc;
    }, {});
  } catch (error) {
    logger.warn('Unable to read app_settings; falling back to defaults', { error });
    return {};
  }
};

const persistSettingValue = async (key: string, value?: string | null) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    await query('DELETE FROM public.app_settings WHERE setting_key = $1', [key]);
    return;
  }
  await query(
    `INSERT INTO public.app_settings (setting_key, setting_value, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (setting_key)
     DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now()`,
    [key, normalized]
  );
};

export const getN8nWebhookConfig = async (): Promise<N8nWebhookConfig> => {
  const snapshot = await fetchSettingSnapshot();
  const modeRaw = snapshot[SETTING_KEYS.mode];
  const mode: WebhookMode = modeRaw === 'PRD' ? 'PRD' : modeRaw === 'TEST' ? 'TEST' : DEFAULTS.mode;
  const testUrl = snapshot[SETTING_KEYS.testUrl] || DEFAULTS.testUrl;
  const prdUrl = snapshot[SETTING_KEYS.prdUrl] || DEFAULTS.prdUrl;
  const activeUrl = mode === 'PRD' ? prdUrl || testUrl : testUrl || prdUrl;

  return {
    mode,
    testUrl: testUrl || null,
    prdUrl: prdUrl || null,
    activeUrl: activeUrl || null,
  };
};

export interface UpdateWebhookConfigInput {
  mode?: WebhookMode;
  testUrl?: string | null;
  prdUrl?: string | null;
}

export const updateN8nWebhookConfig = async (input: UpdateWebhookConfigInput) => {
  if (input.mode) {
    await persistSettingValue(SETTING_KEYS.mode, input.mode);
  }
  if (input.testUrl !== undefined) {
    await persistSettingValue(SETTING_KEYS.testUrl, input.testUrl);
  }
  if (input.prdUrl !== undefined) {
    await persistSettingValue(SETTING_KEYS.prdUrl, input.prdUrl);
  }
};
