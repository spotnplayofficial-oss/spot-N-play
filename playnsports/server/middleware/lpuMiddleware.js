const requireLpuVerified = (req, res, next) => {
  if (req.user?.lpuVerified) return next();
  res.status(403);
  throw new Error('LPU verification is required for this feature');
};

export { requireLpuVerified };
