import express from 'express';
import { getCustomers, createCustomer, updateCustomer, getCustomerPMPlans, getCustomerById, getCustomerServers, createCustomerBatch, getEnvs, getCustomerEnvs, addCustomerServerEnvs, getCustomerWorkspaceDetails } from '../controllers/customersController';

const router = express.Router();

// Route to get all customers
router.get('/', getCustomers);

// DEBUG route: server counts per customer
import { getServerCounts } from '../controllers/customersController';
router.get('/debug/server-counts', getServerCounts);
import { getCustomerApps } from '../controllers/customersController';
router.get('/debug/:id/apps', getCustomerApps);
import { getAllAppDetails } from '../controllers/customersController';
router.get('/debug/apps-all', getAllAppDetails);

// Route to list env values (must be before routes with :id)
router.get('/envs', getEnvs);

// Route to get single customer by id
router.get('/:id', getCustomerById);

// Get PM plans for a specific customer
router.get('/:id/pm-plans', getCustomerPMPlans);

// Get servers for a specific customer
router.get('/:id/servers', getCustomerServers);

// Get env list (customer_env) for specific customer
router.get('/:id/envs', getCustomerEnvs);

// Workspace details per environment for specific customer
router.get('/:id/workspace-details', getCustomerWorkspaceDetails);

// Add server_env rows and link to customer_env for a specific customer
router.post('/:id/server-envs', addCustomerServerEnvs);

// Route to create a new customer
router.post('/', createCustomer);

// Route to create customer + related records in batch (customer, envs, customer_env, pm_plan, apps)
router.post('/batch', createCustomerBatch);

// Route to list env values
router.get('/envs', getEnvs);

// Route to update an existing customer
router.put('/:id', updateCustomer);

export default router;