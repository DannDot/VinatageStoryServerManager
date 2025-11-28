import express from 'express';
import cors from 'cors';
import routes from './routes';

export const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('Vintage Story Server Manager API');
});
