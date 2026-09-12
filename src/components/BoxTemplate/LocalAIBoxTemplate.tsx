import type { BoxProps } from '@modules/Box';
import { lazy, Suspense, useCallback } from 'react';

// Lazy so neither the panel nor its worker-facing modules land in the initial
// bundle: the box only renders once the user asks for `::ai`.
const LocalAIPanel = lazy(
  async () => import('../../features/local-ai/LocalAIPanel'),
);

// Adapts the framework-agnostic panel to the Box contract. The panel publishes
// settled output through `onResultChange`, so the card's Copy button and the
// Enter shortcut operate on the real answer while streaming stays local to the
// panel — one box-list re-render per generation instead of one per token.
const LocalAIBoxTemplate = ({
  onResultChange,
}: BoxProps): React.JSX.Element => {
  const handleOutput = useCallback(
    (text: string) => {
      onResultChange?.({ options: null, plaintextOutput: text });
    },
    [onResultChange],
  );

  return (
    <Suspense fallback={<div className="loader" />}>
      <LocalAIPanel onOutput={handleOutput} />
    </Suspense>
  );
};

export default LocalAIBoxTemplate;
