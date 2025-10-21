import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import customerRoutes from './routes/customers';
import pmRoutes from './routes/pm';
import { Pool } from 'pg';

// Initialize the Express application
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// PostgreSQL connection
const pool = new Pool({
    user: 'your_username',
    host: 'localhost',
    database: 'your_database',
    password: 'your_password',
    port: 5432,
});

// Test database connection
pool.connect()
    .then(() => console.log('Connected to PostgreSQL database'))
    .catch(err => console.error('Database connection error', err));

// Routes
app.use('/api/customers', customerRoutes);
app.use('/api/pm', pmRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});