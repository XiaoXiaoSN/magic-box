import { ChmodBoxSource } from '@modules/boxSources/ChmodBoxSource';
import { describe, expect, it } from 'vitest';

type StringOptions = Record<string, string>;

function optionsFor(
  box: Awaited<ReturnType<typeof ChmodBoxSource.generateBoxes>>[number],
): StringOptions {
  return box.props.options as StringOptions;
}

describe('ChmodBoxSource', () => {
  it('requires an explicit chmod or umask option', async () => {
    expect(ChmodBoxSource.canHandle('755', null)).toBe(false);
    await expect(ChmodBoxSource.generateBoxes('755', null)).resolves.toEqual(
      [],
    );
  });

  it.each([
    ['755', '0755', 'rwxr-xr-x', 'u=rwx,g=rx,o=rx'],
    ['0644', '0644', 'rw-r--r--', 'u=rw,g=r,o=r'],
    ['4755', '4755', 'rwsr-xr-x', 'u=rwxs,g=rx,o=rx'],
    ['1777', '1777', 'rwxrwxrwt', 'u=rwx,g=rwx,o=rwxt'],
    ['4000', '4000', '--S------', 'u=s,g=,o='],
    ['1000', '1000', '--------T', 'u=,g=,o=t'],
  ])('converts known octal mode %s', async (input, octal, symbolic, assignments) => {
    const [box] = await ChmodBoxSource.generateBoxes(input, { chmod: true });
    expect(optionsFor(box)).toMatchObject({
      Octal: octal,
      Symbolic: symbolic,
      Assignments: assignments,
    });
    expect(optionsFor(box).Command).toBe(`chmod ${octal} <file>`);
  });

  it('accepts rwx strings with a validated optional file-type prefix', async () => {
    const [file] = await ChmodBoxSource.generateBoxes('-rw-r--r--', {
      chmod: true,
    });
    expect(optionsFor(file)).toMatchObject({
      Octal: '0644',
      'File type': 'regular file',
    });
    expect(optionsFor(file).Symbolic).toBe('-rw-r--r--');

    const [directory] = await ChmodBoxSource.generateBoxes('drwxr-xr-x', {
      chmod: true,
    });
    expect(optionsFor(directory)).toMatchObject({
      Octal: '0755',
      'File type': 'directory',
    });
  });

  it('accepts only complete absolute u/g/o assignments', async () => {
    const [box] = await ChmodBoxSource.generateBoxes('u=rwx,g=rx,o=rx', {
      chmod: true,
    });
    expect(optionsFor(box).Octal).toBe('0755');

    const [special] = await ChmodBoxSource.generateBoxes('u=rwxs,g=rx,o=rx', {
      chmod: true,
    });
    expect(optionsFor(special).Octal).toBe('4755');
  });

  it.each([
    'u+x',
    'g-w',
    '755x',
    '+755',
    '888',
    '75',
    '07555',
    'u=rwx,g=rx',
    'u=rwx,u=rw,g=rx,o=rx',
    'u=rwxt,g=rx,o=rx',
    'q=rwx,g=rx,o=rx',
  ])('rejects unsupported mode syntax %s', async (input) => {
    const [box] = await ChmodBoxSource.generateBoxes(input, { chmod: true });
    expect(box.props.plaintextOutput).toContain('Use a 3–4 digit octal mode');
  });

  it('round-trips all 4096 permission modes between octal, symbolic, and assignments', async () => {
    for (let mode = 0; mode <= 0o7777; mode += 1) {
      const octal = mode.toString(8).padStart(4, '0');
      const [fromOctal] = await ChmodBoxSource.generateBoxes(octal, {
        chmod: true,
      });
      const fields = optionsFor(fromOctal);
      const [fromSymbolic] = await ChmodBoxSource.generateBoxes(
        fields.Symbolic,
        { chmod: true },
      );
      const [fromAssignments] = await ChmodBoxSource.generateBoxes(
        fields.Assignments,
        { chmod: true },
      );
      expect(optionsFor(fromSymbolic).Octal).toBe(octal);
      expect(optionsFor(fromAssignments).Octal).toBe(octal);
    }
  });

  it('computes file and directory creation modes from an absolute umask', async () => {
    const [box] = await ChmodBoxSource.generateBoxes('', { umask: '022' });
    expect(optionsFor(box)).toMatchObject({
      Umask: '0022',
      'New file (base 0666)': '0644',
      'New directory (base 0777)': '0755',
    });

    const [closed] = await ChmodBoxSource.generateBoxes('', { umask: '0777' });
    expect(optionsFor(closed)).toMatchObject({
      'New file (base 0666)': '0000',
      'New directory (base 0777)': '0000',
    });
  });

  it.each([
    '',
    '888',
    '1000',
    '4755',
    '022x',
  ])('rejects invalid umask %s', async (umask) => {
    const [box] = await ChmodBoxSource.generateBoxes('', { umask });
    expect(box.props.plaintextOutput).toContain(
      'Use ::umask with a 3–4 digit octal mask',
    );
  });

  it('returns useful errors for missing values and oversized input', async () => {
    const [missing] = await ChmodBoxSource.generateBoxes('', { chmod: true });
    expect(missing.props.plaintextOutput).toContain(
      'Relative forms such as u+x',
    );

    const [large] = await ChmodBoxSource.generateBoxes('7'.repeat(65), {
      chmod: true,
    });
    expect(large.props.plaintextOutput).toContain('up to 64 characters');
  });
});
