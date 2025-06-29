import React from 'react';

import CloseIcon from '@mui/icons-material/Close';
import { Grid, IconButton, Paper } from '@mui/material';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atelierCaveLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import boxStyles from './styles';

import type { BoxProps } from '@modules/Box';

interface CodeBoxTemplateProps extends BoxProps {
  large?: boolean;
  onClose?: () => void;
}

const CodeBoxTemplate = ({
  name,
  plaintextOutput,
  options,
  onClick,
  large = false,
  onClose,
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
      <Paper elevation={3} sx={(theme) => ({
        ...(typeof boxStyles.paper === 'function' ? boxStyles.paper(theme) : boxStyles.paper),
        ...(large && {
          padding: theme.spacing(4),
        }),
      })}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 data-testid="magic-box-result-title" style={{ margin: 0 }}>{name}</h3>
          {onClose ? <IconButton aria-label="close" onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton> : null}
        </div>
        {/* https://react-syntax-highlighter.github.io/react-syntax-highlighter/demo/ */}
        <SyntaxHighlighter
          customStyle={{ maxHeight: large ? '60vh' : '250px' }}
          data-testid="magic-box-result-text"
          language={language}
          sx={atelierCaveLight}
        >
          {plaintextOutput}
        </SyntaxHighlighter>
      </Paper>
    </Grid>
  );
};

CodeBoxTemplate.supportsLarge = true;

export default CodeBoxTemplate; 