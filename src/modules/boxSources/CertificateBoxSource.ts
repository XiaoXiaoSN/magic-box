import { CodeBoxTemplate } from '@components/BoxTemplate';
import { decodeCertificates } from '@functions/certificates';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, errorBox, hasOptionKeys } from '@modules/Box';

export const CertificateBoxSource = {
  name: 'Certificate Decode',
  description: 'Decode PEM X.509 certificates and CA bundles locally. ::cert',
  defaultInput: 'Paste a PEM certificate here\n::cert',
  tag: 'CA',
  kind: 'Decode',
  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (
      !hasOptionKeys(options, 'cert', 'certificate', 'ca') &&
      !input.includes('-----BEGIN CERTIFICATE-----')
    )
      return [];
    try {
      const results = await decodeCertificates(input);
      return results.map((result, index) =>
        new BoxBuilder(`Certificate ${index + 1}`, result)
          .setTemplate(CodeBoxTemplate)
          .setOptions({ language: 'plaintext' })
          .build(),
      );
    } catch (error) {
      return [
        errorBox(
          'Certificate Decode',
          error instanceof Error ? error.message : 'Invalid certificate.',
        ),
      ];
    }
  },
};

export default CertificateBoxSource;
