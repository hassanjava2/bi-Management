import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:1111@localhost:5432/bi_management_v3";

export const db = drizzle(
  postgres(connectionString, { max: 10 }),
  { schema }
);

export type Db = typeof db;
