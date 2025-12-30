import express from 'express';
import { getN8nWebhookSettings, updateN8nWebhookSettings } from '../controllers/settingsController';

const router = express.Router();

router.get('/n8n-webhook', getN8nWebhookSettings);
router.put('/n8n-webhook', updateN8nWebhookSettings);

export default router;
