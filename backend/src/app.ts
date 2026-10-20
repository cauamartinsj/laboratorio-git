import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { devicesRouter } from './routes/devices';

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json());

// Verificação de conectividade do servidor
app.get('/api/health', (req, res) => {
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Rastreamento Backend API',
  });
});

app.use('/api/auth', authRouter);
app.use('/api/devices', devicesRouter);
