import { readdirSync, readFileSync } from "node:fs";
import { expect } from "vitest";

const migrationsDirectory = new URL("../../supabase/migrations/", import.meta.url);
const socialMigrationFiles = readdirSync(migrationsDirectory)
  .filter((fileName) => /^\d+_.*\.sql$/.test(fileName))
  .sort();

export const migrationSql = socialMigrationFiles
  .map((fileName) => readFileSync(new URL(fileName, migrationsDirectory), "utf8"))
  .join("\n");

export function policyBlock(sql: string, policyName: string): string {
  const policyStart = sql.lastIndexOf(`create policy ${policyName}`);
  const nextPolicyStart = sql.indexOf("create policy ", policyStart + 1);

  expect(policyStart, `${policyName} should exist`).toBeGreaterThanOrEqual(0);
  return sql.slice(policyStart, nextPolicyStart < 0 ? undefined : nextPolicyStart);
}

export function sqlStatements(sql: string): readonly string[] {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export function functionBlock(sql: string, functionName: string): string {
  const signatureStart = `${functionName}(`;
  const functionStart = sql.lastIndexOf(`create or replace function ${signatureStart}`);
  const functionEnd = sql.indexOf("\n$$;", functionStart);

  expect(functionStart, `${functionName} should exist`).toBeGreaterThanOrEqual(0);
  expect(functionEnd, `${functionName} should terminate`).toBeGreaterThan(functionStart);
  return sql.slice(functionStart, functionEnd);
}
