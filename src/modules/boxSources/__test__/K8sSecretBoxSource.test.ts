import { expect } from 'vitest';

import { K8sSecretBoxSource } from '../K8sSecretBoxSource';

describe('K8sSecretBoxSource', () => {
  const validSecretYaml = `
apiVersion: v1
kind: Secret
metadata:
  name: test-secret
type: Opaque
data:
  username: YWRtaW4=
  password: cGFzc3dvcmQxMjM=
`;

  const nonReadableSecretYaml = `
apiVersion: v1
kind: Secret
metadata:
  name: test-secret
type: Opaque
data:
  data: AAAA
  password: cGFzc3dvcmQxMjM=
`;

  const nonSecretYaml = `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-configmap
data:
  username: admin
  password: password123
`;

  const multiDocumentYaml = `
---
apiVersion: v1
kind: Secret
metadata:
  name: first-secret
data:
  username: YWRtaW4=
---
apiVersion: v1
kind: Secret
metadata:
  name: second-secret
stringData:
  password: plain-password
`;

  const listYaml = `
apiVersion: v1
kind: List
items:
  - apiVersion: v1
    kind: Secret
    metadata:
      name: list-first
    data:
      username: YWRtaW4=
  - apiVersion: v1
    kind: ConfigMap
    metadata:
      name: ignored-config
  - apiVersion: v1
    kind: Secret
    metadata:
      name: list-second
    stringData:
      password: plain-password
`;

  describe('checkMatch', () => {
    it('should return undefined for empty input', async () => {
      await expect(K8sSecretBoxSource.checkMatch('')).resolves.toBeUndefined();
    });

    it('should return undefined for non-YAML input', async () => {
      await expect(
        K8sSecretBoxSource.checkMatch('invalid yaml'),
      ).resolves.toBeUndefined();
    });

    it('should return undefined for non-Secret YAML', async () => {
      await expect(
        K8sSecretBoxSource.checkMatch(nonSecretYaml),
      ).resolves.toBeUndefined();
    });

    it('should decode valid K8s Secret', async () => {
      const result = await K8sSecretBoxSource.checkMatch(validSecretYaml);
      expect(result).toBeDefined();
      expect(result?.data).toEqual({
        username: 'admin',
        password: 'password123',
      });
    });

    it('should decode non-base64 K8s Secret', async () => {
      const result = await K8sSecretBoxSource.checkMatch(nonReadableSecretYaml);
      expect(result).toBeDefined();
      expect(result?.data).toEqual({
        data: '<unreadable-string>',
        password: 'password123',
      });
    });

    it('accepts JSON Secret input', async () => {
      const result = await K8sSecretBoxSource.checkMatch(
        JSON.stringify({
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: { name: 'json-secret' },
          data: { username: 'YWRtaW4=' },
        }),
      );

      expect(result?.data).toEqual({ username: 'admin' });
    });

    it('rejects non-string data values without coercion', async () => {
      const result = await K8sSecretBoxSource.checkMatch(`
apiVersion: v1
kind: Secret
data:
  numeric: 1234
`);

      expect(result?.data).toEqual({ numeric: '<invalid-base64>' });
    });

    it('uses a null-prototype output object for special keys', async () => {
      const result = await K8sSecretBoxSource.checkMatch(`
apiVersion: v1
kind: Secret
data:
  __proto__: YWJj
  constructor: Y29uc3RydWN0b3I=
`);

      expect(result).toBeDefined();
      expect(Object.getPrototypeOf(result?.data)).toBeNull();
      expect(Object.keys(result?.data ?? {})).toEqual([
        '__proto__',
        'constructor',
      ]);
      expect(result?.data).toMatchObject({
        __proto__: 'abc',
        constructor: 'constructor',
      });
    });
  });

  describe('generateBoxes', () => {
    it('should return empty array for invalid input', async () => {
      const boxes = await K8sSecretBoxSource.generateBoxes('invalid yaml');
      expect(boxes).toHaveLength(0);
    });

    it('should return empty array for non-Secret YAML', async () => {
      const boxes = await K8sSecretBoxSource.generateBoxes(nonSecretYaml);
      expect(boxes).toHaveLength(0);
    });

    it('should generate box for valid Secret', async () => {
      const boxes = await K8sSecretBoxSource.generateBoxes(validSecretYaml);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Kubernetes Secret');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].props.options).toEqual({
        username: 'admin',
        password: 'password123',
      });
      expect(boxes[0].view).toBe('keyValue');
    });

    it('should return empty array for non-readable data', async () => {
      const boxes = await K8sSecretBoxSource.generateBoxes(
        nonReadableSecretYaml,
      );
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Kubernetes Secret');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].props.options).toEqual({
        data: '<unreadable-string>',
        password: 'password123',
      });
      expect(boxes[0].view).toBe('keyValue');
    });

    it('supports wrapped base64 and lets stringData override data', async () => {
      const boxes = await K8sSecretBoxSource.generateBoxes(`
apiVersion: v1
kind: Secret
data:
  password: |
    cGFzc
    3dvcmQ=
stringData:
  password: plaintext
  username: admin
`);

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.options).toEqual({
        password: 'plaintext',
        username: 'admin',
      });
    });

    it('supports multiple Secret documents with names', async () => {
      const boxes = await K8sSecretBoxSource.generateBoxes(multiDocumentYaml);

      expect(boxes).toHaveLength(2);
      expect(boxes.map((box) => box.props.name)).toEqual([
        'Kubernetes Secret: first-secret',
        'Kubernetes Secret: second-secret',
      ]);
      expect(boxes[0].props.options).toEqual({ username: 'admin' });
      expect(boxes[1].props.options).toEqual({ password: 'plain-password' });
    });

    it('supports Secret items in a List', async () => {
      const boxes = await K8sSecretBoxSource.generateBoxes(listYaml);

      expect(boxes).toHaveLength(2);
      expect(boxes.map((box) => box.props.name)).toEqual([
        'Kubernetes Secret: list-first',
        'Kubernetes Secret: list-second',
      ]);
    });

    it('marks malformed UTF-8 as unreadable', async () => {
      const boxes = await K8sSecretBoxSource.generateBoxes(`
apiVersion: v1
kind: Secret
data:
  binary: QQ//
`);

      expect(boxes[0].props.options).toEqual({
        binary: '<unreadable-string>',
      });
    });

    it('keeps malformed base64 separate from unreadable UTF-8', async () => {
      const boxes = await K8sSecretBoxSource.generateBoxes(`
apiVersion: v1
kind: Secret
data:
  malformed: abcde
`);

      expect(boxes[0].props.options).toEqual({
        malformed: '<invalid-base64>',
      });
    });

    it('returns an informative box for an empty Secret', async () => {
      const boxes = await K8sSecretBoxSource.generateBoxes(`
apiVersion: v1
kind: Secret
metadata:
  name: empty-secret
`);

      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.plaintextOutput).toContain(
        'no data or stringData entries',
      );
      expect(boxes[0].props.plaintextOutput).not.toBe('');
      expect(boxes[0].view).toBeUndefined();
    });
  });
});
