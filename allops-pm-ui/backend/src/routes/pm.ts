import express from 'express';
import { getPMTasks, createPMTask, updatePMTask, deletePMTask, getPMById, importPM, getPmRoundByKeys, getImportHeader, getAlfrescoApiResponses, getAppContentSizingRows, getAppResponseRows, importPMData, importAlfrescoApiData, importAppContentSizingData, importAppOtherApiResponses } from '../controllers/pmController';

const router = express.Router();

// Route to get all PM tasks
router.get('/', getPMTasks);

// Route to create a new PM task
router.post('/', createPMTask);

// Route to update an existing PM task
router.put('/:id', updatePMTask);

// Route to lookup pm_round rows by keys (pm_id, env_id, server_id)
router.get('/round', getPmRoundByKeys);

// Consolidated header/status for Import PM page
router.get('/import/header', getImportHeader);

// Application sizing snapshots for Import PM page
router.get('/:pmId/app-content-sizing', getAppContentSizingRows);

// Application other API response snapshots for Import PM page
router.get('/:pmId/app-responses', getAppResponseRows);

// Alfresco API data snapshot for Import PM page
router.get('/:pmId/alfresco-api', getAlfrescoApiResponses);

// Route to get a single PM plan by id
router.get('/:id', getPMById);

// Route to import PMs from JSON payload
router.post('/import', importPM);

// Route to import PM data (server, contentstore, pm_round)
router.post('/import/data', importPMData);

// Route to import Alfresco API data
router.post('/import/alfresco-api', importAlfrescoApiData);

// Route to import Application sizing snapshots
router.post('/import/app-content-sizing', importAppContentSizingData);

// Route to import Application other API responses
router.post('/import/app-responses', importAppOtherApiResponses);

// Route to delete a PM task
router.delete('/:id', deletePMTask);

export default router;