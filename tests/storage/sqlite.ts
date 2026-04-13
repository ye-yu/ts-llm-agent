import { DatabaseSync } from "node:sqlite";

export class Id {
  value: string;
  constructor(value?: string) {
    this.value = value ?? newId();
  }

  toString() {
    return this.value;
  }
}
export function Stringifiable<T extends object>(objectType: new (...args: any[]) => T): Types<T>;
export function Stringifiable<T extends object>(objectType: new (...args: any[]) => T, array: true): Types<Array<T>>;
export function Stringifiable<T extends object>(objectType: new (...args: any[]) => T, array?: boolean): Types<T> {
  return objectType as Types<T>;
}

type Types<JsonSerializable = any> =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | DateConstructor
  | Id
  | JsonSerializable;
type Schema = Record<string, Record<string, Types>>;
type ResolvedType<T extends Record<string, Types>> = {
  [K in keyof T]: T[K] extends StringConstructor
    ? string
    : T[K] extends NumberConstructor
      ? number
      : T[K] extends BooleanConstructor
        ? boolean
        : T[K] extends DateConstructor
          ? Date
          : T[K] extends typeof Id
            ? string | Id
            : T[K] extends Types<infer JsonSerializable>
              ? JsonSerializable
              : never;
};

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Database<T extends Schema> = Prettify<
  {
    [k in keyof T]: {
      insert(data: Prettify<ResolvedType<T[k]>>): Promise<void>;
      findById(id: string | Id): Promise<Prettify<ResolvedType<T[k]>> | null>;
      findAll(limit?: number, offset?: number): Promise<Prettify<ResolvedType<T[k]>>[]>;
      update(id: string | Id, data: Prettify<ResolvedType<T[k]>>): Promise<void>;
      delete(id: string | Id): Promise<void>;
    };
  } & {
    db: DatabaseSync;
  }
>;

export function createSchemaAsDatabase<T extends Schema>(schema: T): Database<T> {
  const db = new DatabaseSync(":memory:");
  const preprocess: Record<string, Set<string>> = {};
  // create tables
  for (const tableName in schema) {
    const columns = schema[tableName];
    const columnDefs = Object.entries(columns)
      .map(([colName, colType]) => {
        let typeDef: string;
        if (colType === String) {
          typeDef = "TEXT";
        } else if (colType === Number) {
          typeDef = "REAL";
        } else if (colType === Boolean) {
          typeDef = "INTEGER";
        } else if (colType === Date) {
          typeDef = "TEXT";
        } else if (colType === Id) {
          typeDef = "TEXT PRIMARY KEY";
        } else {
          // try serializing as json
          typeDef = "TEXT";
          preprocess[tableName] = preprocess[tableName] || new Set();
          preprocess[tableName].add(colName);
        }
        return `${colName} ${typeDef}`;
      })
      .join(", ");
    db.exec(`CREATE TABLE ${String(tableName)} (${columnDefs})`);
  }
  return {
    db,
    ...(Object.keys(schema) as (keyof T)[]).reduce((acc, tableName) => {
      return {
        ...acc,
        [tableName]: {
          insert: async (data: any) => {
            const columns = Object.keys(schema[tableName]);
            const placeholders = columns.map(() => "?").join(", ");
            const stmt = db.prepare(
              `INSERT INTO ${String(tableName)} (${columns.join(", ")}) VALUES (${placeholders})`,
            );
            stmt.run(
              ...columns.map((col) => {
                const value = data[col as keyof typeof data];
                if (preprocess[String(tableName)]?.has(col)) {
                  return JSON.stringify(value);
                }
                if (value instanceof Date) {
                  return value.toISOString();
                }
                if (typeof value === "boolean") {
                  return value ? 1 : 0;
                }
                return value;
              }),
            );
          },
          findById: async (id: string | Id) => {
            const stmt = db.prepare(`SELECT * FROM ${String(tableName)} WHERE id = ?`);
            const row = stmt.get(String(id));
            if (!row) {
              return null;
            }
            // postprocess row
            const result: any = {};
            for (const col in row) {
              const colType = schema[tableName][col];
              let value: any = row[col];
              if (colType === Date) {
                value = new Date(value);
              } else if (colType === Boolean) {
                value = Boolean(value);
              } else if (preprocess[String(tableName)]?.has(col)) {
                value = JSON.parse(value);
              }
              result[col] = value;
            }
            return result as Prettify<ResolvedType<T[typeof tableName]>>;
          },
          findAll: async (limit?: number, offset?: number) => {
            let query = `SELECT * FROM ${String(tableName)}`;
            if (typeof limit === "number") {
              query += ` LIMIT ${limit}`;
            }
            if (typeof offset === "number") {
              query += ` OFFSET ${offset}`;
            }
            const stmt = db.prepare(query);
            return stmt.all() as Prettify<ResolvedType<T[typeof tableName]>>[];
          },
          update: async (id: string | Id, data: Prettify<ResolvedType<T[typeof tableName]>>) => {
            const columns = Object.keys(schema[tableName]);
            const setClause = columns.map((col) => `${col} = ?`).join(", ");
            const stmt = db.prepare(`UPDATE ${String(tableName)} SET ${setClause} WHERE id = ?`);
            stmt.run(
              ...columns.map((col): any => {
                const value = data[col as keyof typeof data];
                if (preprocess[String(tableName)]?.has(col)) {
                  return JSON.stringify(value);
                }
                if (value instanceof Date) {
                  return value.toISOString();
                }
                if (typeof value === "boolean") {
                  return value ? 1 : 0;
                }
                return value;
              }),
              String(id),
            );
          },
          delete: async (id: string | Id) => {
            const stmt = db.prepare(`DELETE FROM ${String(tableName)} WHERE id = ?`);
            stmt.run(String(id));
          },
        },
      };
    }, {} as any),
  };
}

export function newId(): string {
  const ts = Date.now().toString(16).padStart(8, "0");
  const uuid = crypto.randomUUID().split("-")[1];
  return `${ts}-${uuid}`;
}
