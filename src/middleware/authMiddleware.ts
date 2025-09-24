import { Request, Response, NextFunction } from 'express';
import { verifyTokenAndGetUser } from '../utils/verifyTokenAndGetUser';
import { AppError } from '../errors/appError';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = (req as any).cookies?.jwt;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not authorized to access this route', 401));
    }

    const user = await verifyTokenAndGetUser(token, next);
    if (!user) return; // verifyTokenAndGetUser will handle the error via next

    (req as any).user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return next(new AppError('You are restricted from accessing this route', 403));
    }
    next();
  };
};

export const authenticate = protect;
export const authorize = restrictTo; 