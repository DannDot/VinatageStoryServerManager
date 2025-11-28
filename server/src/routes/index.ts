import { Router } from 'express';
import { ServerController } from '../controllers/ServerController';

const router = Router();
const serverController = new ServerController();

router.get('/status', (req, res) => {
  res.json({ status: 'online', message: 'Server Manager is running' });
});

router.get('/versions', (req, res) => serverController.getVersions(req, res));
router.post('/install', (req, res) => serverController.installVersion(req, res));
router.post('/start', (req, res) => serverController.startServer(req, res));
router.post('/stop', (req, res) => serverController.stopServer(req, res));
router.get('/server-status', (req, res) => serverController.getStatus(req, res));
router.post('/command', (req, res) => serverController.sendCommand(req, res));

export default router;
