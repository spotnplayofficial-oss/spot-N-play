const isSafeHttpUrl = (value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

const requireSafeHttpUrl = (value, label = 'URL') => {
  if (!isSafeHttpUrl(value)) {
    const err = new Error(`${label} must be a valid http/https URL`);
    err.status = 400;
    throw err;
  }
};

export { isSafeHttpUrl, requireSafeHttpUrl };
