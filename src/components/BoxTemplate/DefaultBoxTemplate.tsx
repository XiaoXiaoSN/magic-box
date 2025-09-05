import { Box, Grid, Typography } from '@mui/material';

import Modal from '@components/Modal';
import { extendSxProps } from '@functions/muiHelper';

import boxStyles from './styles';

import type { BoxProps } from '@modules/Box';

interface DefaultBoxTemplateProps extends BoxProps {
  largeModal?: boolean;
  onClose?: () => void;
}

const DefaultBoxTemplate = ({
  name,
  plaintextOutput,
  onClick,
  largeModal = false,
  onClose,
  selected = false,
}: DefaultBoxTemplateProps): React.JSX.Element => (
  <Grid
    onClick={() => onClick(plaintextOutput)}
    size={{ xs: 12, sm: 12 }}
    sx={boxStyles.grid}
  >
    <Box sx={selected ? boxStyles.selectedPaper : undefined}>
      <Modal
        onClose={onClose}
        testId="magic-box-result-title"
        title={name}
        sx={extendSxProps(
          typeof boxStyles.paper === 'function'
            ? boxStyles.paper
            : boxStyles.paper,
          largeModal ? (theme) => ({ padding: theme.spacing(4) }) : undefined
        )}
      >
      <Typography
        data-testid="magic-box-result-text"
        sx={boxStyles.paperTypography}
      >
        {plaintextOutput}
      </Typography>
      </Modal>
    </Box>
  </Grid>
);

DefaultBoxTemplate.supportsLarge = true;

export default DefaultBoxTemplate;
