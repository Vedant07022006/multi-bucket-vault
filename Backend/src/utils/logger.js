const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const MIN_LEVEL =
  LEVELS[process.env.LOG_LEVEL] ??
  (process.env.NODE_ENV === "production" ? LEVELS.info : LEVELS.debug);

// Helper function to format timestamp and print log
const formatAndLog = (level, args) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  const consoleMethod = level === "error" || level === "warn" ? level : "log";
  console[consoleMethod](prefix, ...args);
};

// Singleton Logger Object
// In Node.js, when you export an object from a file module, Node caches it.
// Every file that imports this `logger` gets the exact same instance!
const logger = {
  debug: (...args) => LEVELS.debug >= MIN_LEVEL && formatAndLog("debug", args),
  info: (...args) => LEVELS.info >= MIN_LEVEL && formatAndLog("info", args),
  warn: (...args) => LEVELS.warn >= MIN_LEVEL && formatAndLog("warn", args),
  error: (...args) => LEVELS.error >= MIN_LEVEL && formatAndLog("error", args),
};

export default logger;