import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import authRoutes from './api/routes/auth.js';
import whatsappRoutes from './api/routes/whatsapp.js';
import agentsRoutes from './api/routes/agents.js';
import messagesRoutes from './api/routes/messages.js';
import knowledgeRoutes from './api/routes/knowledge.js';
import analyticsRoutes from './api/routes/analytics.js';
import flowsRoutes from './api/routes/flows.js';
import templatesRoutes from './api/routes/templates.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/flows', flowsRoutes);
app.use('/api/templates', templatesRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`🚀 Engage Africa IO Backend running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
