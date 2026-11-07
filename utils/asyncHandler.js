/**
 * Simple wrapper around async controller functions
 * Automatically catches any errors and forwards them to the next error middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
export { asyncHandler };
