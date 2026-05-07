import type { BoxProps } from '@modules/Box';
import { QRCodeCanvas } from 'qrcode.react';
import { memo } from 'react';

const QRCodeBoxTemplate = memo(
  ({ plaintextOutput, largeModal = false }: BoxProps): React.JSX.Element => (
    <div
      data-testid="magic-box-result-text"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: largeModal ? 24 : 8,
      }}
    >
      <QRCodeCanvas size={largeModal ? 384 : 220} value={plaintextOutput} />
    </div>
  ),
);

export default QRCodeBoxTemplate;
