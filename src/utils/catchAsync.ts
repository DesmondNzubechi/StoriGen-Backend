import { Request, Response, NextFunction } from "express";

interface theAsyncMiddleware<T extends Request = Request> {
  (req: T, res: Response, next: NextFunction): Promise<any>;
}

const catchAsync = <T extends Request = Request>(fn: theAsyncMiddleware<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req as T, res, next).catch(next);
  };
};

export default catchAsync;
