import { Console } from "console";
import { styleText } from "node:util";

type LogLevel = "debug" | "info" | "warn" | "error";

function tokenToRegex(token: string) {
  // Escape regex special chars, except *
  const escaped = token
    .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
    .replace(/\*/g, '.*?');

  return new RegExp(`^${escaped}$`);
}

function parseDebugEnv(debugEnv?: string) {
  debugEnv ??= process.env.DEBUG
  const enables: RegExp[] = [];
  const skips: RegExp[] = [];

  if (!debugEnv) {
    return { enables, skips };
  }

  const tokens = debugEnv.split(/[\s,]+/);

  for (const token of tokens) {
    if (!token) continue;

    if (token.startsWith('-')) {
      skips.push(tokenToRegex(token.slice(1)));
    } else {
      enables.push(tokenToRegex(token));
    }
  }

  return { enables, skips };
}

function isNamespaceEnabled(namespace: string, debugEnv?: string) {
  const { enables, skips } = parseDebugEnv(debugEnv);

  // If any skip matches → disabled
  for (const re of skips) {
    if (re.test(namespace)) {
      return false;
    }
  }

  // If any enable matches → enabled
  for (const re of enables) {
    if (re.test(namespace)) {
      return true;
    }
  }

  return false;
}

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}
type Gettable<T> = Prettify<T & { replaceInstance: (gettable: T) => void }>
function wrapGetter<T extends object>(gettable: T): Gettable<T> {
  const obj = {
    replaceInstance: (instance) => {
      gettable = instance
    }
  } as Gettable<T>
  for (const k in gettable) {
    Object.defineProperty(obj, k, {
      enumerable: false,
      get() {
        return Reflect.get(gettable, k)
      }
    })
  }

  return obj
}

const registeredLoggers: { prefix: string, logger: Gettable<Console> }[] = []

export function reinstallLoggers(debugEnv?: string) {
  for (const logger of registeredLoggers) {
    if (!isNamespaceEnabled(logger.prefix, debugEnv)) {
      logger.logger.replaceInstance(NoopLogger.self)
    } else {
      logger.logger.replaceInstance(new PrefixedLogger(logger.prefix))
    }
  }

}

export function getLogger(namespace: string): Console {
  const console = wrapGetter<Console>(NoopLogger.self)
  registeredLoggers.push({ prefix: namespace, logger: console })
  const enabled = isNamespaceEnabled(namespace)
  if (enabled) {
    console.replaceInstance(new PrefixedLogger(namespace))
  }

  return console
}

class NoopLogger extends Console {
  static self = new NoopLogger({
    stdout: process.stdout,
    stderr: process.stderr,
  })
  assert(): void {
    return;
  }
  clear(): void {
    return;
  }
  count(): void {
    return;
  }
  countReset(): void {
    return;
  }
  debug(): void {
    return;
  }
  dir(): void {
    return;
  }
  dirxml(): void {
    return;
  }
  error(): void {
    return;
  }
  group(): void {
    return;
  }
  groupCollapsed(): void {
    return;
  }
  groupEnd(): void {
    return;
  }
  info(): void {
    return;
  }
  log(): void {
    return;
  }
  table(): void {
    return;
  }
  time(): void {
    return;
  }
  timeEnd(): void {
    return;
  }
  timeLog(): void {
    return;
  }
  timeStamp(): void {
    return;
  }
  trace(): void {
    return;
  }
  warn(): void {
    return;
  }
  profile(): void {
    return;
  }
  profileEnd(): void {
    return;
  }
}

const levelStyles: Record<LogLevel, string[]> = {
  debug: ["dim", "cyan"],
  info: ["green"],
  warn: ["yellow", "bold"],
  error: ["red", "bold"],
};

export class PrefixedLogger extends Console {
  readonly #prefix: string;

  constructor(prefix: string) {
    super({
      stdout: process.stdout,
      stderr: process.stderr,
    })
    this.#prefix = prefix;
  }

  #format(level: LogLevel, msg: string): string {
    const styles = levelStyles[level] as any[];
    const tag = styleText(styles, `[${level.toUpperCase()}]`);
    const pfx = styleText(["magenta", "bold"], `[${this.#prefix}]`);
    return `${pfx} ${tag} ${msg}`;
  }

  debug(...args: unknown[]): void {
    console.debug(this.#format("debug", args.map(String).join(" ")));
  }

  info(...args: unknown[]): void {
    console.info(this.#format("info", args.map(String).join(" ")));
  }

  warn(...args: unknown[]): void {
    console.warn(this.#format("warn", args.map(String).join(" ")));
  }

  error(...args: unknown[]): void {
    console.error(this.#format("error", args.map(String).join(" ")));
  }
}
