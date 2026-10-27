import express, { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[Global Express Error Handler]:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Lỗi hệ thống máy chủ';
  
  if (res.headersSent) {
    return next(err);
  }

  res.status(status).json({
    error: message,
    status
  });
}

export function notFoundHandler(req: Request, res: Response) {
  if (req.path.startsWith('/api/') || req.path.startsWith('/drive/')) {
    res.status(404).json({ error: `API route "${req.method} ${req.path}" không tồn tại.` });
  } else {
    res.status(404).send('Page not found');
  }
}
