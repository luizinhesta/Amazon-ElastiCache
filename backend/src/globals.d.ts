// Declarações globais para ambiente Node.js/Lambda
// @types/node não é necessário em produção pois Lambda fornece esses globals

declare var process: {
  env: Record<string, string | undefined>;
};

declare var console: {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  info(...args: unknown[]): void;
};
