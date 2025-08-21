import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Estendiamo l'interfaccia Request di Express per includere le info dell'utente
declare global {
    namespace Express {
        interface Request {
            user?: { id: string; email: string };
        }
    }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.sendStatus(401); // Unauthorized
    }

    jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
        if (err) {
            return res.sendStatus(403); // Forbidden
        }
        req.user = user;
        next();
    });
}