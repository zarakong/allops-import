import { Request, Response } from 'express';
import { getN8nWebhookConfig, updateN8nWebhookConfig, WebhookMode } from '../utils/n8nConfig';

const normalizeMode = (value: unknown): WebhookMode | undefined => {
  if (typeof value !== 'string') return undefined;
  const upper = value.toUpperCase();
  if (upper === 'PRD') return 'PRD';
  if (upper === 'TEST') return 'TEST';
  return undefined;
};

const normalizeUrl = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export const getN8nWebhookSettings = async (_req: Request, res: Response) => {
  try {
    const config = await getN8nWebhookConfig();
    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load webhook settings', detail: (error as Error).message });
  }
};

export const updateN8nWebhookSettings = async (req: Request, res: Response) => {
  try {
    const mode = normalizeMode(req.body?.mode);
    const testUrl = normalizeUrl(req.body?.testUrl);
    const prdUrl = normalizeUrl(req.body?.prdUrl);

    if (req.body?.mode && !mode) {
      return res.status(400).json({ error: 'mode must be TEST or PRD' });
    }

    const current = await getN8nWebhookConfig();
    const nextMode = mode || current.mode;
    const nextTestUrl = testUrl !== undefined ? testUrl : current.testUrl;
    const nextPrdUrl = prdUrl !== undefined ? prdUrl : current.prdUrl;

    if (nextMode === 'PRD' && !nextPrdUrl) {
      return res.status(400).json({ error: 'PRD URL is required when mode is PRD' });
    }

    if (!nextTestUrl && !nextPrdUrl) {
      return res.status(400).json({ error: 'At least one webhook URL must be configured' });
    }

    await updateN8nWebhookConfig({ mode, testUrl, prdUrl });
    const updated = await getN8nWebhookConfig();
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update webhook settings', detail: (error as Error).message });
  }
};
