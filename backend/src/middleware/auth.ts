import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
import { db } from '../services/database.js';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    // Allow demo-token in development mode
    if (token === 'demo-token' && process.env.NODE_ENV === 'development') {
      // Use a valid UUID for demo user
      const demoUserId = '00000000-0000-0000-0000-000000000001';
      const demoEmail = 'demo@engage.io';
      
      // Check if demo user exists, create if not
      try {
        const existingUser = await db.getUserByEmail(demoEmail);
        if (existingUser) {
          req.user = { id: existingUser.id, email: existingUser.email };
        } else {
          // Create demo user
          const newUser = await db.createUser({
            email: demoEmail,
            name: 'Demo User',
            created_at: new Date().toISOString()
          });
          req.user = { id: newUser.id, email: newUser.email };
        }
      } catch (error) {
        // If database fails, use hardcoded UUID
        req.user = { id: demoUserId, email: demoEmail };
      }
      
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};
