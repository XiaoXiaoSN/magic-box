import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { describe, expect, it } from 'vitest';

import { IpInCidrBoxSource } from '../IpInCidrBoxSource';

describe('IpInCidrBoxSource', () => {
  describe('generateBoxes', () => {
    it('returns [] when no trigger option is present', async () => {
      const boxes = await IpInCidrBoxSource.generateBoxes('10.0.0.5', null);
      expect(boxes).toHaveLength(0);
    });

    it('returns [] when options exist but neither ipincidr nor incidr key', async () => {
      const boxes = await IpInCidrBoxSource.generateBoxes('10.0.0.5', {
        hash: true,
      });
      expect(boxes).toHaveLength(0);
    });

    describe('/24 network', () => {
      it('10.0.0.5 is in 10.0.0.0/24', async () => {
        const boxes = await IpInCidrBoxSource.generateBoxes('10.0.0.5', {
          ipincidr: '10.0.0.0/24',
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.['In Range']).toBe('true');
        expect(boxes[0].props.options?.Network).toBe('10.0.0.0');
        expect(boxes[0].props.options?.Broadcast).toBe('10.0.0.255');
        expect(boxes[0].props.options?.IP).toBe('10.0.0.5');
        expect(boxes[0].props.options?.CIDR).toBe('10.0.0.0/24');
        expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
      });

      it('10.0.1.5 is NOT in 10.0.0.0/24', async () => {
        const boxes = await IpInCidrBoxSource.generateBoxes('10.0.1.5', {
          ipincidr: '10.0.0.0/24',
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.['In Range']).toBe('false');
        expect(boxes[0].props.options?.Network).toBe('10.0.0.0');
        expect(boxes[0].props.options?.Broadcast).toBe('10.0.0.255');
      });
    });

    describe('/25 network boundary', () => {
      it('192.168.1.130 is in 192.168.1.128/25 (upper half)', async () => {
        const boxes = await IpInCidrBoxSource.generateBoxes('192.168.1.130', {
          ipincidr: '192.168.1.128/25',
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.['In Range']).toBe('true');
        expect(boxes[0].props.options?.Network).toBe('192.168.1.128');
        expect(boxes[0].props.options?.Broadcast).toBe('192.168.1.255');
      });

      it('192.168.1.100 is NOT in 192.168.1.128/25 (lower half)', async () => {
        const boxes = await IpInCidrBoxSource.generateBoxes('192.168.1.100', {
          ipincidr: '192.168.1.128/25',
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.['In Range']).toBe('false');
      });
    });

    describe('/32 exact host match', () => {
      it('1.2.3.4 is in 1.2.3.4/32', async () => {
        const boxes = await IpInCidrBoxSource.generateBoxes('1.2.3.4', {
          ipincidr: '1.2.3.4/32',
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.['In Range']).toBe('true');
        expect(boxes[0].props.options?.Network).toBe('1.2.3.4');
        expect(boxes[0].props.options?.Broadcast).toBe('1.2.3.4');
      });

      it('1.2.3.5 is NOT in 1.2.3.4/32', async () => {
        const boxes = await IpInCidrBoxSource.generateBoxes('1.2.3.5', {
          ipincidr: '1.2.3.4/32',
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.['In Range']).toBe('false');
      });
    });

    describe('incidr alias', () => {
      it('accepts ::incidr option key as an alias', async () => {
        const boxes = await IpInCidrBoxSource.generateBoxes('10.0.0.1', {
          incidr: '10.0.0.0/24',
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.['In Range']).toBe('true');
      });
    });

    describe('invalid inputs', () => {
      it('invalid IP 999.1.1.1 produces an error box', async () => {
        const boxes = await IpInCidrBoxSource.generateBoxes('999.1.1.1', {
          ipincidr: '10.0.0.0/24',
        });
        expect(boxes).toHaveLength(1);
        const errMsg = boxes[0].props.options?.Error as string;
        expect(errMsg).toBeTruthy();
        expect(errMsg.toLowerCase()).toContain('invalid');
      });

      it('invalid CIDR produces an error box', async () => {
        const boxes = await IpInCidrBoxSource.generateBoxes('10.0.0.1', {
          ipincidr: 'notacidr',
        });
        expect(boxes).toHaveLength(1);
        const errMsg = boxes[0].props.options?.Error as string;
        expect(errMsg).toBeTruthy();
        expect(errMsg.toLowerCase()).toContain('invalid');
      });

      it('CIDR prefix out of range (> 32) produces an error box', async () => {
        const boxes = await IpInCidrBoxSource.generateBoxes('10.0.0.1', {
          ipincidr: '10.0.0.0/33',
        });
        expect(boxes).toHaveLength(1);
        expect(boxes[0].props.options?.Error).toBeTruthy();
      });

      it('both IP and CIDR invalid produces an error box mentioning both', async () => {
        const boxes = await IpInCidrBoxSource.generateBoxes('bad', {
          ipincidr: 'also-bad',
        });
        expect(boxes).toHaveLength(1);
        const errMsg = boxes[0].props.options?.Error as string;
        expect(errMsg.toLowerCase()).toContain('invalid');
      });
    });

    describe('priority and template', () => {
      it('sets priority to 10', async () => {
        const boxes = await IpInCidrBoxSource.generateBoxes('10.0.0.1', {
          ipincidr: '10.0.0.0/24',
        });
        expect(boxes[0].props.priority).toBe(10);
      });

      it('uses KeyValueBoxTemplate', async () => {
        const boxes = await IpInCidrBoxSource.generateBoxes('10.0.0.1', {
          ipincidr: '10.0.0.0/24',
        });
        expect(boxes[0].boxTemplate).toBe(KeyValueBoxTemplate);
      });
    });
  });
});
