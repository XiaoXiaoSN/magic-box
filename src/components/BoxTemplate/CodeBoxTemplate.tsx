import { retryableLazy } from '@components/ErrorBoundary';
import type { ThemeMode } from '@global/theme';
import type { BoxProps } from '@modules/Box';
import { CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { memo, Suspense } from 'react';
import type { SyntaxHighlighterProps } from 'react-syntax-highlighter';

const MAX_HIGHLIGHT_CHARACTERS = 20_000;
const MAX_HIGHLIGHT_LINES = 600;
const RESULT_TEST_ID = 'magic-box-result-text';
const codeStyle = {
  margin: 0,
  background: 'transparent',
  padding: 0,
  overflow: 'auto',
  textAlign: 'left',
  fontSize: '13px',
  lineHeight: 1.5,
} as const;
const previewStyle = { ...codeStyle, maxHeight: '250px' };
const modalStyle = { ...codeStyle, maxHeight: '60vh' };

interface HighlighterProps {
  language: string;
  children: string;
  mode: ThemeMode;
  customStyle?: SyntaxHighlighterProps['customStyle'];
}

// lazy-load the Light build so the highlighter stays out of the main bundle.
// only the languages actually used by the app are registered, avoiding the
// 500+ per-language chunks emitted when importing the full build.
const LazyHighlighter = retryableLazy(async () => {
  const [
    { default: SyntaxHighlighter },
    atomOneLight,
    atomOneDark,
    json,
    yaml,
    xml,
    diff,
  ] = await Promise.all([
    import('react-syntax-highlighter/dist/esm/light'),
    import('react-syntax-highlighter/dist/esm/styles/hljs/atom-one-light'),
    import('react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark'),
    import('react-syntax-highlighter/dist/esm/languages/hljs/json'),
    import('react-syntax-highlighter/dist/esm/languages/hljs/yaml'),
    import('react-syntax-highlighter/dist/esm/languages/hljs/xml'),
    import('react-syntax-highlighter/dist/esm/languages/hljs/diff'),
  ]);

  SyntaxHighlighter.registerLanguage('json', json.default);
  SyntaxHighlighter.registerLanguage('yaml', yaml.default);
  // xml covers HTML as well
  SyntaxHighlighter.registerLanguage('xml', xml.default);
  SyntaxHighlighter.registerLanguage('diff', diff.default);

  // both hljs palettes are plain style objects (a few KB each) and the theme
  // can flip at any time, so they are resolved once here rather than reloaded
  // on every switch.
  const hljsStyles = {
    light: atomOneLight.default,
    dark: atomOneDark.default,
  };

  return {
    default: ({ language, children, mode, customStyle }: HighlighterProps) => (
      <SyntaxHighlighter
        customStyle={customStyle}
        data-testid={RESULT_TEST_ID}
        language={language}
        style={hljsStyles[mode]}
      >
        {children}
      </SyntaxHighlighter>
    ),
  };
});

function shouldHighlight(language: string, code: string): boolean {
  if (
    language === 'plaintext' ||
    language === 'text' ||
    language === 'toml' ||
    code.length > MAX_HIGHLIGHT_CHARACTERS
  )
    return false;

  let lines = 1;
  for (
    let index = code.indexOf('\n');
    index !== -1;
    index = code.indexOf('\n', index + 1)
  ) {
    if (++lines > MAX_HIGHLIGHT_LINES) return false;
  }
  return true;
}

const CodeOutput = memo(function CodeOutput({
  code,
  language,
  largeModal,
}: {
  code: string;
  language: string;
  largeModal: boolean;
}): React.JSX.Element {
  // AppThemeProvider mirrors the resolved app theme onto the MUI palette, so
  // this stays in step with it. Rendered outside a provider (isolated tests)
  // MUI's default light theme applies, matching the previous behaviour.
  const mode: ThemeMode = useTheme().palette.mode;
  const style = largeModal ? modalStyle : previewStyle;
  if (!shouldHighlight(language, code)) {
    return (
      <pre data-testid={RESULT_TEST_ID} style={style}>
        <code className="language-plaintext">{code}</code>
      </pre>
    );
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
      <LazyHighlighter language={language} mode={mode} customStyle={style}>
        {code}
      </LazyHighlighter>
    </Suspense>
  );
});

function CodeBoxTemplate({
  plaintextOutput,
  options,
  largeModal = false,
}: BoxProps): React.JSX.Element {
  const language =
    typeof options?.language === 'string' ? options.language : 'yaml';
  return (
    <CodeOutput
      code={plaintextOutput}
      language={language}
      largeModal={largeModal}
    />
  );
}

export default CodeBoxTemplate;
