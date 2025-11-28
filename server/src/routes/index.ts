import { Router } from 'express';
import { ServerController } from '../controllers/ServerController';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const serverController = new ServerController();
const authController = new AuthController();

// Public routes
router.post('/login', (req, res) => authController.login(req, res));

// Protected routes
router.use(authMiddleware);

router.post('/change-password', (req, res) => authController.changePassword(req, res));

router.get('/status', (req, res) => {
  res.json({ status: 'online', message: 'Server Manager is running' });
});

router.get('/versions', (req, res) => serverController.getVersions(req, res));
router.post('/install', (req, res) => serverController.installVersion(req, res));

router.get('/instances', (req, res) => serverController.getInstances(req, res));
router.post('/instances', (req, res) => serverController.createInstance(req, res));
router.delete('/instances/:id', (req, res) => serverController.deleteInstance(req, res));

router.post('/start', (req, res) => serverController.startServer(req, res));
router.post('/stop', (req, res) => serverController.stopServer(req, res));
router.get('/config/:instanceId', (req, res) => serverController.getConfig(req, res));
router.post('/config/:instanceId', (req, res) => serverController.saveConfig(req, res));
router.get('/server-status', (req, res) => serverController.getStatus(req, res));
router.post('/command', (req, res) => serverController.sendCommand(req, res));

export default router;
