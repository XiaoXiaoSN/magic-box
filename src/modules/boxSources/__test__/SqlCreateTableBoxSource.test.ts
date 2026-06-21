import { CodeBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { SqlCreateTableBoxSource } from '../SqlCreateTableBoxSource';

describe('SqlCreateTableBoxSource', () => {
  it('returns [] when no trigger option is present', async () => {
    const boxes = await SqlCreateTableBoxSource.generateBoxes('{"id":1}', null);
    expect(boxes).toHaveLength(0);
  });

  it('returns [] when unrelated option is present', async () => {
    const boxes = await SqlCreateTableBoxSource.generateBoxes('{"id":1}', {
      base64: true,
    });
    expect(boxes).toHaveLength(0);
  });

  it('infers types from a simple object with ::sqltable', async () => {
    const boxes = await SqlCreateTableBoxSource.generateBoxes(
      '{"id":1,"name":"Bob","active":true}',
      { sqltable: 'users' },
    );
    expect(boxes).toHaveLength(1);
    const sql = boxes[0].props.plaintextOutput;
    expect(sql).toContain('CREATE TABLE "users"');
    expect(sql).toContain('"id" INTEGER PRIMARY KEY');
    expect(sql).toContain('"name" TEXT');
    expect(sql).toContain('"active" BOOLEAN');
  });

  it('infers DOUBLE PRECISION for a float column', async () => {
    const boxes = await SqlCreateTableBoxSource.generateBoxes('{"price":1.5}', {
      sqltable: 'p',
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toContain(
      '"price" DOUBLE PRECISION',
    );
  });

  it('unions columns from an array of objects', async () => {
    const boxes = await SqlCreateTableBoxSource.generateBoxes(
      '[{"a":1},{"b":"x"}]',
      { sqltable: 't' },
    );
    expect(boxes).toHaveLength(1);
    const sql = boxes[0].props.plaintextOutput;
    expect(sql).toContain('"a" INTEGER');
    expect(sql).toContain('"b" TEXT');
  });

  it('uses "my_table" when ::sqltable has no value', async () => {
    const boxes = await SqlCreateTableBoxSource.generateBoxes('{"x":1}', {
      sqltable: true,
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toContain('CREATE TABLE "my_table"');
  });

  it('uses "my_table" when ::sqltable value contains only invalid characters', async () => {
    const boxes = await SqlCreateTableBoxSource.generateBoxes('{"x":1}', {
      sqltable: '!!!',
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toContain('CREATE TABLE "my_table"');
  });

  it('returns an error box for invalid JSON', async () => {
    const boxes = await SqlCreateTableBoxSource.generateBoxes('{bad', {
      sqltable: 'x',
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toContain(
      'Error: invalid JSON input',
    );
  });

  it('triggers on ::createtable as an alias', async () => {
    const boxes = await SqlCreateTableBoxSource.generateBoxes('{"id":1}', {
      createtable: 'things',
    });
    expect(boxes).toHaveLength(1);
    expect(boxes[0].props.plaintextOutput).toContain('CREATE TABLE "things"');
  });

  it('uses CodeBoxTemplate', async () => {
    const boxes = await SqlCreateTableBoxSource.generateBoxes('{"id":1}', {
      sqltable: 'users',
    });
    expect(boxes[0].boxTemplate).toBe(CodeBoxTemplate);
  });

  it('sets sql language option', async () => {
    const boxes = await SqlCreateTableBoxSource.generateBoxes('{"id":1}', {
      sqltable: 'users',
    });
    expect(boxes[0].props.options).toEqual({ language: 'sql' });
  });

  it('sets priority', async () => {
    const boxes = await SqlCreateTableBoxSource.generateBoxes('{"id":1}', {
      sqltable: 'users',
    });
    expect(boxes[0].props.priority).toBe(10);
  });

  it('strips invalid characters from table name', async () => {
    const boxes = await SqlCreateTableBoxSource.generateBoxes('{"x":1}', {
      sqltable: 'my-table!',
    });
    expect(boxes).toHaveLength(1);
    // hyphens and ! stripped → "mytable"
    expect(boxes[0].props.plaintextOutput).toContain('CREATE TABLE "mytable"');
  });
});
