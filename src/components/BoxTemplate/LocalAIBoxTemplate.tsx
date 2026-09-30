import type { BoxProps } from '@modules/Box';
import { lazy, Suspense, useCallback, useEffect, useRef } from 'react';

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
  plaintextOutput,
  sourceInput,
}: BoxProps): React.JSX.Element => {
  // What this box last told the card it holds. The panel outlives the Box
  // object: every edit of the magic input regenerates boxes, and the fresh one
  // arrives with an empty `plaintextOutput` while the same mounted panel still
  // shows its answer. Without re-publishing, the card's Copy button and Enter
  // shortcut went silent on an answer that is on screen.
  const publishedRef = useRef<string | null>(null);
  const handleOutput = useCallback(
    (text: string) => {
      publishedRef.current = text;
      onResultChange?.({ options: null, plaintextOutput: text });
    },
    [onResultChange],
  );

  useEffect(() => {
    const published = publishedRef.current;
    if (published !== null && plaintextOutput !== published) {
      onResultChange?.({ options: null, plaintextOutput: published });
    }
  }, [plaintextOutput, onResultChange]);

  return (
    <Suspense fallback={<div className="loader" />}>
      <LocalAIPanel onOutput={handleOutput} sourceInput={sourceInput} />
    </Suspense>
  );
};

export default LocalAIBoxTemplate;
