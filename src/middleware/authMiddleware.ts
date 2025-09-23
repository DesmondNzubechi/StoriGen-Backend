import { Request, Response, NextFunction } from 'express';

// Dummy protect middleware (replace with real logic)
export const protect = (req: Request, res: Response, next: NextFunction) => {
  // TODO: Implement JWT or session authentication
  next();
};

// Dummy restrictTo middleware (replace with real logic)
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // TODO: Implement role-based access control
    next();
  };
};

// Alias for protect function
export const authenticate = protect;

// Alias for restrictTo function
export const authorize = restrictTo; 