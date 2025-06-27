import { expect } from 'vitest';

import { KeyValueBoxTemplate } from '@components/BoxTemplate';

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

  describe('checkMatch', () => {
    it('should return undefined for empty input', () => {
      expect(K8sSecretBoxSource.checkMatch('')).toBeUndefined();
    });

    it('should return undefined for non-YAML input', () => {
      expect(K8sSecretBoxSource.checkMatch('invalid yaml')).toBeUndefined();
    });

    it('should return undefined for non-Secret YAML', () => {
      expect(K8sSecretBoxSource.checkMatch(nonSecretYaml)).toBeUndefined();
    });

    it('should decode valid K8s Secret', () => {
      const result = K8sSecretBoxSource.checkMatch(validSecretYaml);
      expect(result).toBeDefined();
      expect(result?.data).toEqual({
        username: 'admin',
        password: 'password123',
      });
    });

    it('should decode non-base64 K8s Secret', () => {
      const result = K8sSecretBoxSource.checkMatch(nonReadableSecretYaml);
      expect(result).toBeDefined();
      expect(result?.data).toEqual({
        data: '<unreadable-string>',
        password: 'password123',
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
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });

    it('should return empty array for non-readable data', async () => {
      const boxes = await K8sSecretBoxSource.generateBoxes(nonReadableSecretYaml);
      expect(boxes).toHaveLength(1);
      expect(boxes[0].props.name).toBe('Kubernetes Secret');
      expect(boxes[0].props.priority).toBe(10);
      expect(boxes[0].props.options).toEqual({
        data: '<unreadable-string>',
        password: 'password123',
      });
      expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
    });
  });
});
