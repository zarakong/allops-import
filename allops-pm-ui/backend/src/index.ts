import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import customerRoutes from './routes/customers';
import pmRoutes from './routes/pm';
import settingsRoutes from './routes/settings';

// Initialize the Express application
const app = express();
const PORT = process.env.PORT || 5000;

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