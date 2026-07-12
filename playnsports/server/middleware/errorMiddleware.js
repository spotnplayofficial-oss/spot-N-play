const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    res.status(400);
    return res.json({
      message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
  }

  // Handle Mongoose duplicate key error (e.g. email already exists)
  if (err.code === 11000) {
    res.status(400);
    return res.json({
      message: 'Duplicate field value entered. A user with this email may already exist.',
      stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
  }

  res.status(statusCode);
  res.json({
    message: err.message,
    code: typeof err.code === 'string' ? err.code : undefined,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

export { errorHandler };
