// Logger kecil agar output konsisten di seluruh modul.
export function createLogger(scope) {
  const prefix = scope ? `[${scope}]` : '[bot]';

  return {
    info: (...args) => console.log(prefix, ...args),
    warn: (...args) => console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args),
    debug: (...args) => {
      if (process.env.LOG_LEVEL === 'debug') console.debug(prefix, ...args);
    }
  };
}
