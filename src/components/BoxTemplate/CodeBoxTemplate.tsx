import type { ThemeMode } from '@global/theme';
import type { BoxProps } from '@modules/Box';
import { CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { lazy, memo, Suspense } from 'react';

interface HighlighterProps {
  language: string;
  children: string;
  mode: ThemeMode;
  customStyle?: React.CSSProperties;
  dataTestId?: string;
}

// lazy-load the Light build so the highlighter stays out of the main bundle.
// only the languages actually used by the app are registered, avoiding the
// 500+ per-language chunks emitted when importing the full build.
const LazyHighlighter = lazy(async () => {
  const [
    { Light: SyntaxHighlighter },
    atomOneLight,
    atomOneDark,
    json,
    yaml,
    xml,
  ] = await Promise.all([
    import('react-syntax-highlighter'),
    import('react-syntax-highlighter/dist/esm/styles/hljs/atom-one-light'),
    import('react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark'),
    import('react-syntax-highlighter/dist/esm/languages/hljs/json'),
    import('react-syntax-highlighter/dist/esm/languages/hljs/yaml'),
    import('react-syntax-highlighter/dist/esm/languages/hljs/xml'),
  ]);

  SyntaxHighlighter.registerLanguage('json', json.default);
  SyntaxHighlighter.registerLanguage('yaml', yaml.default);
  // xml covers HTML as well
  SyntaxHighlighter.registerLanguage('xml', xml.default);
  // hljs has no toml grammar; toml output falls back to plaintext highlighting

  // both hljs palettes are plain style objects (a few KB each) and the theme
  // can flip at any time, so they are resolved once here rather than reloaded
  // on every switch.
  const hljsStyles = {
    light: atomOneLight.default,
    dark: atomOneDark.default,
  };

  return {
    default: ({
      language,
      children,
      mode,
      customStyle,
      dataTestId,
    }: HighlighterProps) => (
      <SyntaxHighlighter
        customStyle={customStyle}
        data-testid={dataTestId}
        // map toml to 'plaintext' since hljs has no toml grammar
        language={language === 'toml' ? 'plaintext' : language}
        style={hljsStyles[mode]}
      >
        {children}
      </SyntaxHighlighter>
    ),
  };
});

const CodeBoxTemplateComponent = ({
  plaintextOutput,
  options,
  largeModal = false,
}: BoxProps): React.JSX.Element => {
  // AppThemeProvider mirrors the resolved app theme onto the MUI palette, so
  // this stays in step with it. Rendered outside a provider (isolated tests)
  // MUI's default light theme applies, matching the previous behaviour.
  const mode: ThemeMode = useTheme().palette.mode;
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
        mode={mode}
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
