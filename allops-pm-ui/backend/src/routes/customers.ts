import express from 'express';
import multer from 'multer';
import { getCustomers, createCustomer, updateCustomer, getCustomerPMPlans, getCustomerById, getCustomerServers, createCustomerBatch, getEnvs, getCustomerEnvs, addCustomerServerEnvs, getCustomerWorkspaceDetails, getCustomerWorkspaceContentStore, getCustomerDiagramProject, uploadCustomerDiagramProject, checkDiagramWebhookHealth, proxyCustomerDiagramImage, updateServerPaths, getAllAppList, getServerApplications, addServerApplication, removeServerApplication } from '../controllers/customersController';

const router = express.Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: Number(process.env.DIAGRAM_MAX_FILE_MB || 5) * 1024 * 1024,
	},
});

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

// Get all application list
router.get('/app-list', getAllAppList);

// Diagram webhook health
router.get('/diagram-webhook-health', checkDiagramWebhookHealth);

// Route to get single customer by id
router.get('/:id', getCustomerById);

// Get PM plans for a specific customer
router.get('/:id/pm-plans', getCustomerPMPlans);

// Get servers for a specific customer
router.get('/:id/servers', getCustomerServers);

router.put('/:id/servers/:serverId/paths', updateServerPaths);

// Server applications management
router.get('/:id/servers/:serverId/applications', getServerApplications);
router.post('/:id/servers/:serverId/applications', addServerApplication);
router.delete('/:id/servers/:serverId/applications/:appId', removeServerApplication);

// Get env list (customer_env) for specific customer
router.get('/:id/envs', getCustomerEnvs);

// Workspace details per environment for specific customer
router.get('/:id/workspace-details', getCustomerWorkspaceDetails);
router.get('/:id/workspace-content-store', getCustomerWorkspaceContentStore);

// Diagram project image for specific customer
router.get('/:id/diagram-project/image', proxyCustomerDiagramImage);
router.get('/:id/diagram-project', getCustomerDiagramProject);
router.post('/:id/diagram-project', upload.single('diagram'), uploadCustomerDiagramProject);

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