import { CodeBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;
const MAX_INPUT = 100_000;

// reserved prototype-chain keys — safe to read Object.keys, but guard defensively
const BANNED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function sanitizeTableName(raw: string | boolean | undefined): string {
  if (!raw || raw === true) return 'my_table';
  const cleaned = String(raw).replace(/[^A-Za-z0-9_]/g, '');
  return cleaned.length > 0 ? cleaned : 'my_table';
}

// wrap a column/table name in double-quotes, escaping embedded double-quotes
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

type SqlType =
  | 'BOOLEAN'
  | 'INTEGER'
  | 'INTEGER PRIMARY KEY'
  | 'DOUBLE PRECISION'
  | 'TEXT';

function inferType(value: unknown, colName: string): SqlType {
  if (value === null || value === undefined) return 'TEXT';
  if (typeof value === 'boolean') return 'BOOLEAN';
  if (typeof value === 'number') {
    if (Number.isInteger(value) && colName === 'id')
      return 'INTEGER PRIMARY KEY';
    if (Number.isInteger(value)) return 'INTEGER';
    return 'DOUBLE PRECISION';
  }
  if (typeof value === 'object') return 'TEXT'; // nested object/array → serialised TEXT
  return 'TEXT';
}

// build a map of column name → first non-null sample value seen across all rows
function collectColumns(rows: Record<string, unknown>[]): Map<string, unknown> {
  const cols = new Map<string, unknown>();
  for (const row of rows) {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) continue;
    for (const key of Object.keys(row)) {
      if (BANNED_KEYS.has(key)) continue;
      if (!cols.has(key)) {
        cols.set(key, row[key] ?? null);
      } else if (cols.get(key) === null && row[key] != null) {
        // upgrade null placeholder to a concrete value for better type inference
        cols.set(key, row[key]);
      }
    }
  }
  return cols;
}

function buildCreateTable(
  tableName: string,
  cols: Map<string, unknown>,
): string {
  const lines: string[] = [];
  for (const [col, sample] of cols) {
    lines.push(`  ${quoteIdent(col)} ${inferType(sample, col)}`);
  }
  return `CREATE TABLE ${quoteIdent(tableName)} (\n${lines.join(',\n')}\n);`;
}

function errorBox(message: string, priority: number): Box {
  return new BoxBuilder('JSON to SQL Table', message)
    .setTemplate(CodeBoxTemplate)
    .setOptions({ language: 'sql' })
    .setPriority(priority)
    .build();
}

export const SqlCreateTableBoxSource = {
  name: 'JSON to SQL Table',
  description:
    'Infer a CREATE TABLE statement from a JSON object or array of objects. ::sqltable=<tablename>.',
  defaultInput: '{"id":1,"name":"Bob","active":true} ::sqltable=users',
  tag: '#',
  kind: 'Convert',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'sqltable', 'createtable')) return [];
    if (input.length > MAX_INPUT) return [];

    const rawTableName =
      options?.sqltable !== undefined ? options.sqltable : options?.createtable;
    const tableName = sanitizeTableName(rawTableName);

    let parsed: unknown;
    try {
      parsed = JSON.parse(trim(input));
    } catch {
      return [errorBox('Error: invalid JSON input', this.priority)];
    }

    const rows: Record<string, unknown>[] = Array.isArray(parsed)
      ? (parsed as Record<string, unknown>[])
      : [parsed as Record<string, unknown>];

    const cols = collectColumns(rows);

    if (cols.size === 0) {
      return [
        errorBox(
          'Error: no columns could be inferred from the input',
          this.priority,
        ),
      ];
    }

    const sql = buildCreateTable(tableName, cols);

    return [
      new BoxBuilder('JSON to SQL Table', sql)
        .setTemplate(CodeBoxTemplate)
        .setOptions({ language: 'sql' })
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default SqlCreateTableBoxSource;
