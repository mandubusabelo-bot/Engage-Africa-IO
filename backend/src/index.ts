import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env FIRST before any other imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
} else {
  console.log('✅ Environment variables loaded from:', envPath);
  console.log('🔍 SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
  console.log('🔍 SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set');
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { initSupabase } from './services/database.js';
import authRoutes from './api/routes/auth.js';
import whatsappRoutes from './api/routes/whatsapp.js';
import agentsRoutes from './api/routes/agents.js';
import messagesRoutes from './api/routes/messages.js';
import knowledgeRoutes from './api/routes/knowledge.js';
import analyticsRoutes from './api/routes/analytics.js';
import flowsRoutes from './api/routes/flows.js';
import templatesRoutes from './api/routes/templates.js';
import actionsRoutes from './api/routes/actions.js';

// Initialize Supabase now that environment variables are loaded
initSupabase();

const app = express();
const PORT = process.env.PORT || 3001;

// Get directory path for serving static files (using __dirname from top of file)
const frontendDistPath = path.join(__dirname, '../../frontend/dist');

app.use(helmet({
  contentSecurityPolicy: false, // Disable for React app
}));
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } }));

// Serve static files from frontend dist
app.use(express.static(frontendDistPath));

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
app.use('/api/actions', actionsRoutes);

// Catch-all route to serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`🚀 Engage Africa IO Backend running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📁 Serving frontend from: ${frontendDistPath}`);
});

export default app;
