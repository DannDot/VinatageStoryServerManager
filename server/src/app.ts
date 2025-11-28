import express from 'express';
import cors from 'cors';
import path from 'path';
import routes from './routes';

export const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

app.use('/api', routes);

// Serve static files from the client build directory
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// Handle SPA routing - return index.html for any unknown route
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});
