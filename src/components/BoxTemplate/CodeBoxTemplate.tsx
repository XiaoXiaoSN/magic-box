import type { BoxProps } from '@modules/Box';
import { CircularProgress } from '@mui/material';
import { lazy, memo, Suspense } from 'react';

interface HighlighterProps {
  language: string;
  children: string;
  customStyle?: React.CSSProperties;
  dataTestId?: string;
}

// dynamic import to reduce bundle size
const LazyHighlighter = lazy(async () => {
  const [highlighterModule, styleModule] = await Promise.all([
    import('react-syntax-highlighter'),
    import('react-syntax-highlighter/dist/esm/styles/hljs'),
  ]);

  const SyntaxHighlighterComponent = highlighterModule.default;
  const atomOneLight = styleModule.atomOneLight;

  return {
    default: ({
      language,
      children,
      customStyle,
      dataTestId,
    }: HighlighterProps) => (
      <SyntaxHighlighterComponent
        customStyle={customStyle}
        data-testid={dataTestId}
        language={language}
        style={atomOneLight}
      >
        {children}
      </SyntaxHighlighterComponent>
    ),
  };
});

const CodeBoxTemplateComponent = ({
  plaintextOutput,
  options,
  largeModal = false,
}: BoxProps): React.JSX.Element => {
  let language = 'yaml';
  if (
    options &&
    'language' in options &&
    typeof options.language === 'string'
  ) {
    language = options.language;
  }

  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100px',
          }}
        >
          <CircularProgress size={24} />
        </div>
      }
    >
      <LazyHighlighter
        dataTestId="magic-box-result-text"
        language={language}
        customStyle={{
          margin: 0,
          background: 'transparent',
          padding: 0,
          maxHeight: largeModal ? '60vh' : '250px',
          textAlign: 'left',
          fontSize: '13px',
          lineHeight: 1.5,
        }}
      >
        {plaintextOutput}
      </LazyHighlighter>
    </Suspense>
  );
};

const CodeBoxTemplate = Object.assign(memo(CodeBoxTemplateComponent), {
  supportsLarge: true,
});

export default CodeBoxTemplate;
