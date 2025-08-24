import React from 'react';

import { Grid } from '@mui/material';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atelierCaveLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';

import Modal from '@components/Modal';

import boxStyles from './styles';

import type { BoxProps } from '@modules/Box';

interface CodeBoxTemplateProps extends BoxProps {
  largeModal?: boolean;
  onClose?: () => void;
}

const CodeBoxTemplate = ({
  name,
  plaintextOutput,
  options,
  onClick,
  largeModal = false,
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
      <Modal
        onClose={onClose}
        testId="magic-box-result-title"
        title={name}
        sx={(theme) => ({
          ...(typeof boxStyles.paper === 'function' ? boxStyles.paper(theme) : boxStyles.paper),
          ...(largeModal && {
            padding: theme.spacing(4),
          }),
        })}
      >
        {/* https://react-syntax-highlighter.github.io/react-syntax-highlighter/demo/ */}
        <SyntaxHighlighter
          customStyle={{ maxHeight: largeModal ? '60vh' : '250px' }}
          data-testid="magic-box-result-text"
          language={language}
          sx={atelierCaveLight}
        >
          {plaintextOutput}
        </SyntaxHighlighter>
      </Modal>
    </Grid>
  );
};

CodeBoxTemplate.supportsLarge = true;

export default CodeBoxTemplate; 