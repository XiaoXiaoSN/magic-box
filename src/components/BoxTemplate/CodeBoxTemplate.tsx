import { lazy, memo, Suspense } from 'react';

import { CircularProgress, Grid } from '@mui/material';

import Modal from '@components/Modal';
import { extendSxProps } from '@functions/muiHelper';

import boxStyles from './styles';

import type { BoxProps } from '@modules/Box';

interface HighlighterProps {
  language: string;
  children: string;
  customStyle?: React.CSSProperties;
}

// dynamic import to reduce bundle size
const LazyHighlighter = lazy(async () => {
  const [highlighterModule, styleModule] = await Promise.all([
    import('react-syntax-highlighter'),
    import('react-syntax-highlighter/dist/esm/styles/hljs'),
  ]);

  const SyntaxHighlighterComponent = highlighterModule.default;
  const atomOneLight = styleModule.atomOneLight;

  // return a wrapper component with style pre-loaded
  return {
    default: ({ language, children, customStyle }: HighlighterProps) => (
      <SyntaxHighlighterComponent
        customStyle={customStyle}
        data-testid="magic-box-result-text"
        language={language}
        style={atomOneLight}
      >
        {children}
      </SyntaxHighlighterComponent>
    ),
  };
});

interface CodeBoxTemplateProps extends BoxProps {
  largeModal?: boolean;
  onClose?: () => void;
}

const CodeBoxTemplateComponent = ({
  name,
  plaintextOutput,
  options,
  onClick,
  largeModal = false,
  onClose,
  selected = false,
}: CodeBoxTemplateProps): React.JSX.Element => {
  let language = 'yaml';
  if (
    options &&
    'language' in options &&
    typeof options.language === 'string'
  ) {
    language = options.language;
  }

  return (
    <Grid
      onClick={() => onClick(plaintextOutput)}
      size={{ xs: 12, sm: 12 }}
      sx={boxStyles.grid}
    >
      <Modal
        onClose={onClose}
        testId="magic-box-result-title"
        title={name}
        sx={extendSxProps(
          typeof boxStyles.paper === 'function'
            ? boxStyles.paper
            : boxStyles.paper,
          largeModal ? (theme) => ({ padding: theme.spacing(4) }) : undefined,
          selected ? boxStyles.selectedPaper : undefined
        )}
      >
        {/* https://react-syntax-highlighter.github.io/react-syntax-highlighter/demo/ */}
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
            language={language}
            customStyle={{
              maxHeight: largeModal ? '60vh' : '250px',
              textAlign: 'left',
            }}
          >
            {plaintextOutput}
          </LazyHighlighter>
        </Suspense>
      </Modal>
    </Grid>
  );
};

const CodeBoxTemplate = Object.assign(
  memo(CodeBoxTemplateComponent),
  { supportsLarge: true }
);

export default CodeBoxTemplate;
