import pino from "pino";

const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    base: {
      service: "fathom-mcp-server",
      environment: process.env.NODE_ENV || "development",
    },
    redact: {
      paths: ["*.password", "*.token", "*.apiKey", "*.secret"],
      censor: "[REDACTED]",
    },
  },
  pino.destination(2),
);

export default logger;
