import { Request, Response } from 'express';
import { Pool } from 'pg';
import { Customer } from '../types'; // Assuming you have a Customer type defined in your types

const pool = new Pool({
    user: 'your_username',
    host: 'localhost',
    database: 'your_database',
    password: 'your_password',
    port: 5432,
});

// Get all customers
export const getCustomers = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create a new customer
export const createCustomer = async (req: Request, res: Response) => {
    const { cust_name, code, remark } = req.body as Customer;
    try {
        const result = await pool.query(
            'INSERT INTO customers (cust_name, code, remark) VALUES ($1, $2, $3) RETURNING *',
            [cust_name, code, remark]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update a customer
export const updateCustomer = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { cust_name, code, remark } = req.body as Customer;
    try {
        const result = await pool.query(
            'UPDATE customers SET cust_name = $1, code = $2, remark = $3 WHERE id = $4 RETURNING *',
            [cust_name, code, remark, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get PM plans for a customer
export const getPMPlans = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM pm_plans WHERE customer_id = $1', [id]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching PM plans:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};