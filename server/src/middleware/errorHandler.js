export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  let status = error.status || 500;
  let message = error.message || 'Internal server error.';
  let details;

  if (error.name === 'ValidationError') {
    status = 400;
    details = Object.values(error.errors).map((item) => item.message);
    message = 'Validation failed.';
  } else if (error.name === 'CastError') {
    status = 400;
    message = `Invalid ${error.path}.`;
  } else if (error.code === 11000) {
    status = 409;
    message = 'A custom field definition with that name already exists.';
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(error);
  }

  res.status(status).json({ message, ...(details ? { details } : {}) });
}
