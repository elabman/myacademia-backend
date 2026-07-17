/**
 * Wraps an async Express handler so any rejected promise / thrown
 * error is forwarded to next(), landing in the centralized error
 * handler instead of crashing the process.
 */
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
