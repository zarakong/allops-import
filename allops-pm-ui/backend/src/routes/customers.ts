import express from 'express';
import { getCustomers, createCustomer, updateCustomer, getCustomerPMPlans } from '../controllers/customersController';

const router = express.Router();

// Route to get all customers
router.get('/', getCustomers);

// Route to create a new customer
router.post('/', createCustomer);

// Route to update an existing customer
router.put('/:id', updateCustomer);

// Route to get PM plans for a specific customer
router.get('/:id/pm-plans', getCustomerPMPlans);

export default router;