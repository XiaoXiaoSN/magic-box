import { retryableLazy } from '@components/ErrorBoundary';
import type { BoxProps } from '@modules/Box';
import { Suspense, useEffect, useState } from 'react';

// Lazy so neither the panel nor its worker-facing modules land in the initial
// bundle: the box only renders once the user asks for `::ai`.
const LocalAIPanel = retryableLazy(
  () => import('../../features/local-ai/LocalAIPanel'),
);

// Adapts the framework-agnostic panel to the Box contract. The panel publishes
// settled output through `onResultChange`, so the card's Copy button and the
// Enter shortcut operate on the real answer while streaming stays local to the
// panel — one box-list re-render per generation instead of one per token.
const LocalAIBoxTemplate = ({
  onResultChange,
  plaintextOutput,
  sourceInput,
}: BoxProps): React.JSX.Element => {
  // The panel outlives the Box object when edits to the magic input regenerate
  // boxes. Keep its last report so the same effect can publish to both the
  // initial card and replacements that arrive with empty `plaintextOutput`.
  const [published, setPublished] = useState<string | null>(null);

  useEffect(() => {
    if (published !== null && plaintextOutput !== published) {
      onResultChange?.({ options: null, plaintextOutput: published });
    }
  }, [published, plaintextOutput, onResultChange]);

  return (
    <Suspense fallback={<div className="loader" />}>
      <LocalAIPanel onOutput={setPublished} sourceInput={sourceInput} />
    </Suspense>
  );
};

export default LocalAIBoxTemplate;
