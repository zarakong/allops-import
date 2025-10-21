import express from 'express';
import { getPMTasks, createPMTask, updatePMTask, deletePMTask } from '../controllers/pmController';

const router = express.Router();

// Route to get all PM tasks
router.get('/', getPMTasks);

// Route to create a new PM task
router.post('/', createPMTask);

// Route to update an existing PM task
router.put('/:id', updatePMTask);

// Route to delete a PM task
router.delete('/:id', deletePMTask);

export default router;