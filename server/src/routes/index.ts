import { Router } from 'express';

const router = Router();

router.get('/status', (req, res) => {
  res.json({ status: 'online', message: 'Server Manager is running' });
});

export default router;
