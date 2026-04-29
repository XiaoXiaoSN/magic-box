import type { BoxProps } from '@modules/Box';
import { memo } from 'react';

const DefaultBoxTemplateComponent = ({
  plaintextOutput,
}: BoxProps): React.JSX.Element => (
  <pre className="box-out mono" data-testid="magic-box-result-text">
    {plaintextOutput}
  </pre>
);

const DefaultBoxTemplate = Object.assign(memo(DefaultBoxTemplateComponent), {
  supportsLarge: true,
});

export default DefaultBoxTemplate;
