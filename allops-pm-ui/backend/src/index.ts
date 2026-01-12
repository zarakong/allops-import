import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import customerRoutes from './routes/customers';
import pmRoutes from './routes/pm';
import settingsRoutes from './routes/settings';
import { query } from './db';

// Initialize the Express application
const app = express();
const PORT = process.env.PORT || 5000;

const ensureCustomerPathColumns = async () => {
    // Minimal bootstrap migration so new frontend fields do not break older databases.
    await query('ALTER TABLE public.customer ADD COLUMN IF NOT EXISTS path_app VARCHAR(200);');
    await query('ALTER TABLE public.customer ADD COLUMN IF NOT EXISTS path_data VARCHAR(200);');
};

const bootstrap = async () => {
    try {
        await ensureCustomerPathColumns();
    } catch (error) {
        console.error('Failed to ensure customer path columns', error);
        throw error;
    }

    // Middleware
    app.use(cors());
    app.use(bodyParser.json({ limit: '15mb' }));

    // Routes
    app.use('/api/customers', customerRoutes);
    app.use('/api/pm', pmRoutes);
    app.use('/api/settings', settingsRoutes);

    // Start the server
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
};

bootstrap().catch((error) => {
    console.error('Backend failed to start', error);
    process.exit(1);
});