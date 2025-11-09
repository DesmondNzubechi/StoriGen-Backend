import { Request, Response, NextFunction } from "express";
import { verifyTokenAndGetUser } from "../utils/verifyTokenAndGetUser";
import { AppError } from "../errors/appError";
import catchAsync from "../utils/catchAsync";

type AuthenticatedRequest = Request & {
  user?: any;
  authToken?: string;
};

const extractToken = (req: Request): string | null => {
  if (req.cookies?.jwt) {
    return req.cookies.jwt;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
};

export const protect = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = extractToken(req);

    if (!token) {
      return next(
        new AppError("You are not authorized to access this route", 401)
      );
    }

    const user = await verifyTokenAndGetUser(token, next);
    if (!user) {
      return;
    }

    // Store resolved authentication on the request so controllers can rely on it.
    // This dual cookie/header check keeps iOS/Safari users authenticated when
    // cross-site cookies are stripped in third-party contexts.
    req.user = user;
    req.authToken = token;
    next();
  }
);

export const restrictTo = (...roles: string[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user || !roles.includes(user.role)) {
      return next(new AppError("You are restricted from accessing this route", 403));
    }
    next();
  };

export const authenticate = protect;
export const authorize = restrictTo;