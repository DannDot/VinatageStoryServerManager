import express from 'express';
import cors from 'cors';
import routes from './routes';

export const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('Vintage Story Server Manager API');
});
