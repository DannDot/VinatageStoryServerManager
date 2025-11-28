import { Router } from 'express';
import multer from 'multer';
import { ServerController } from '../controllers/ServerController';
import { AuthController } from '../controllers/AuthController';
import { modController } from '../controllers/ModController';
import { backupController } from '../controllers/BackupController';
import { updateController } from '../controllers/UpdateController';
import { whitelistController } from '../controllers/WhitelistController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const serverController = new ServerController();
const authController = new AuthController();
const upload = multer({ dest: 'temp_uploads/' });

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

// Mod routes
router.get('/mods/list', (req, res) => modController.getModList(req, res));
router.post('/mods/refresh', (req, res) => modController.refreshCache(req, res));
router.get('/instances/:id/mods', (req, res) => modController.getInstalledMods(req, res));
router.post('/instances/:id/mods/install', (req, res) => modController.installMod(req, res));
router.post('/instances/:id/mods/upload', upload.single('file'), (req, res) => modController.uploadMod(req, res));
router.delete('/instances/:id/mods/:filename', (req, res) => modController.deleteMod(req, res));

// Backup routes
router.get('/instances/:id/backups', (req, res) => backupController.getBackups(req, res));
router.post('/instances/:id/backups', (req, res) => backupController.createBackup(req, res));
router.post('/instances/:id/backups/restore', (req, res) => backupController.restoreBackup(req, res));
router.delete('/instances/:id/backups/:filename', (req, res) => backupController.deleteBackup(req, res));

// Update routes
router.get('/update/check', (req, res) => updateController.checkUpdate(req, res));
router.post('/update/perform', (req, res) => updateController.performUpdate(req, res));

// Whitelist routes
router.get('/instances/:id/whitelist', (req, res) => whitelistController.getWhitelist(req, res));
router.post('/instances/:id/whitelist', (req, res) => whitelistController.addPlayer(req, res));
router.delete('/instances/:id/whitelist/:username', (req, res) => whitelistController.removePlayer(req, res));
router.post('/instances/:id/whitelist/mode', (req, res) => whitelistController.setMode(req, res));

export default router;
