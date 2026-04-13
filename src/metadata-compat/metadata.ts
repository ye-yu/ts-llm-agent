import * as module from "node:module";

let hasReflectMetadata = false;
try {
  const require = module.createRequire(import.meta.url);
  const resolved = require.resolve("reflect-metadata");
  console.debug("reflect-metadata found at", resolved);
  hasReflectMetadata = true;
} catch (e) {
  hasReflectMetadata = false;
}

const METADATA_STORAGE = new Map<any, Record<string, any>>();

if (typeof Reflect !== "object") {
  throw new Error("Reflect API is not available. Please ensure that you have a polyfill for Reflect.");
}

//region set metadata
if (typeof Reflect.get(Reflect, "metadata") !== "function") {
  Object.defineProperty(Reflect, "metadata", {
    configurable: true,
    get() {
      return (key: any, value: any) => {
        if (!key) {
          throw new Error("Metadata key is required.");
        }
        return (target: Object, propertyKey?: string | symbol, argNumber?: number) => {
          if (typeof argNumber === "number") {
            const storage = METADATA_STORAGE.get(target) || {};
            storage[`${String(propertyKey)}:${argNumber}:${key}`] = value;
            METADATA_STORAGE.set(target, storage);
            return;
          }

          if (propertyKey) {
            const storage = METADATA_STORAGE.get(target) || {};
            storage[`${String(propertyKey)}:${key}`] = value;
            METADATA_STORAGE.set(target, storage);
            return;
          }

          const storage = METADATA_STORAGE.get(target) || {};
          storage[key] = value;
          METADATA_STORAGE.set(target, storage);
        };
      };
    },
  });
}

export type DecoratorFunction = (
  key: string,
  value: any,
) => {
  (target: any): void;
  (target: any, propertyKey: string | symbol): void;
  (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor | number): void;
};

export const Metadata: DecoratorFunction = Reflect.get(Reflect, "metadata");
export const MetadataAppend: DecoratorFunction = (key: string, value: any) => {
  return (target: any, propertyKey?: string | symbol, argNumber?: PropertyDescriptor | number) => {
    const metadata = getMetadata(key, target, propertyKey, typeof argNumber === "number" ? argNumber : undefined) ?? [];
    if (!Array.isArray(metadata)) {
      throw new Error(`Cannot append metadata for key "${key}" because existing metadata is not an array.`);
    }
    metadata.push(value);
    Metadata(key, metadata)(target);
  };
};

//region get metadata
if (typeof Reflect.get(Reflect, "getMetadata") !== "function") {
  Object.defineProperty(Reflect, "getMetadata", {
    configurable: true,
    get() {
      return (key: string, target: any, propertyKey?: any, argNumber?: number): any => {
        const storage = METADATA_STORAGE.get(target);
        if (!storage) {
          return undefined;
        }

        if (typeof argNumber === "number") {
          return storage[`${String(propertyKey)}:${argNumber}:${key}`];
        }

        if (propertyKey) {
          return storage[`${String(propertyKey)}:${key}`];
        }

        return storage[key];
      };
    },
  });
}

export type GetMetadataFn = {
  <T>(key: string, target: T): any;
  <T>(key: string, target: T, propertyKey?: keyof T): any;
  <T>(key: string, target: T, propertyKey?: string | symbol, argNumber?: number): any;
};
export const getMetadata: GetMetadataFn = (...args: any[]): any =>
  Reflect.apply(Reflect.get(Reflect, "getMetadata"), null, args);

export function dumpMetadata(target: Object): Record<string, any> | undefined {
  if (hasReflectMetadata) {
    console.warn(
      "dumpMetadata is not supported when reflect-metadata is available because the metadata storage is internal to reflect-metadata.",
    );
  }
  return METADATA_STORAGE.get(target);
}
