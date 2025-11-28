import http from 'http';
import { app } from './app';
import { initSocket } from './socket';
import { dbService } from './services/DatabaseService';
import { authService } from './services/AuthService';

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Initialize Database, Auth, and start server
dbService.initialize()
  .then(() => authService.initialize())
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to initialize services:', err);
    process.exit(1);
  });
