import React, { useEffect, useState } from 'react';

import CloseIcon from '@mui/icons-material/Close';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';

import {
  CodeBoxTemplate,
  DefaultBoxTemplate,
  KeyValueBoxTemplate,
  NotingMatchBoxTemplate,
} from '@components/BoxTemplate';
import CustomizedSnackbar from '@components/Snackbar';
import copyTextToClipboard from '@functions/clipboard';
import { trim } from '@functions/helper';
import {
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
  CronExpressionBoxSource,
  DateCalculateBoxSource,
  GenerateQRCodeBoxSource,
  JWTBoxSource,
  K8sSecretBoxSource,
  MathExpressionBoxSource,
  MyIPBoxSource,
  NowBoxSource,
  PrettyJSONBoxSource,
  RandomIntegerBoxSource,
  ReadableBytesBoxSource,
  ShortenURLBoxSource,
  TimeFormatBoxSource,
  TimestampBoxSource,
  URLDecodeBoxSource,
  UuidBoxSource,
  WordCountBoxSource,
} from '@modules/boxSources';

import { useSettings } from '../../contexts/SettingsContext';

import type { Box as BoxType, BoxOptions, BoxTemplate } from '@modules/Box';
import type { BoxSource } from '@modules/BoxSource';

const defaultBoxSources: BoxSource[] = [
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
  CronExpressionBoxSource,
  DateCalculateBoxSource,
  GenerateQRCodeBoxSource,
  JWTBoxSource,
  K8sSecretBoxSource,
  MathExpressionBoxSource,
  MyIPBoxSource,
  NowBoxSource,
  PrettyJSONBoxSource,
  RandomIntegerBoxSource,
  ReadableBytesBoxSource,
  ShortenURLBoxSource,
  TimeFormatBoxSource,
  TimestampBoxSource,
  URLDecodeBoxSource,
  UuidBoxSource,
  WordCountBoxSource,
];

interface Props {
  input: string;
  sources?: BoxSource[];
}

// Interface for BoxComponent with static supportsLarge property.
interface LargeSupportBoxComponent extends BoxTemplate {
  supportsLarge?: boolean;
}

// Type guard to check if a BoxComponent supports the 'large' prop.
function isLargeSupportBoxComponent(
  comp: BoxTemplate
): comp is LargeSupportBoxComponent {
  return !!(comp as LargeSupportBoxComponent).supportsLarge;
}

const MagicBox = ({ input: magicIn, sources }: Props): React.JSX.Element => {
  const [notify, setNotify] = useState([0]);
  const [boxes, setBoxes] = useState([] as BoxType[]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBox, setModalBox] = useState<BoxType | null>(null);
  const { getFilteredAndSortedBoxSources } = useSettings();

  // This parses input text to extract the input and options.
  //
  // Example:
  //   Hello World
  //   ::option1
  //   ::option2=
  //   ::Option3=value
  //
  // Will be parsed to:
  //   input: Hello World (string)
  //   options: { option1: true, option2: true, option3: 'value' } (object)
  const parseInput = (input: string): [string, BoxOptions] => {
    const regex = /\n::(\w+)=?(.*)/gm;
    const matches = Array.from(input.matchAll(regex), (match) => [
      match[1],
      match[2],
    ]);

    const initOptions: BoxOptions = {};
    const options = matches.reduce((opts, [key, value]) => {
      const updatedOpts = opts;
      updatedOpts[key.toLowerCase()] = value || true;
      return updatedOpts;
    }, initOptions);

    const replacedInput = input.replaceAll(regex, '');

    return [replacedInput, options];
  };

  const copyText = (text: string) => {
    copyTextToClipboard(text);
    setNotify([Date.now()]);
  };

  const handleOpenModal = (box: BoxType) => {
    setModalBox(box);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalBox(null);
  };

  useEffect(() => {
    if (trim(magicIn) === '') {
      setBoxes([]);
      return;
    }

    const boxSources = sources ?? getFilteredAndSortedBoxSources();
    const [input, options] = parseInput(magicIn);

    const promises = boxSources.map(async (boxSource) =>
      boxSource.generateBoxes(input, options)
    );
    Promise.all(promises).then((resultBoxes) => {
      const newBoxes = resultBoxes
        .filter((box) => box)
        .flat()
        .sort((a, b) => {
          const priorityA = a.props.priority ?? 0;
          const priorityB = b.props.priority ?? 0;
          return priorityB - priorityA;
        })
        .map((box) => {
          const updatedBox = box;
          updatedBox.props.priority = box.props.priority ?? 0;
          return updatedBox;
        });

      setBoxes(newBoxes);

      console.log(`input: ${input}\n`, 'boxes:', newBoxes, 'options:', options);
    });
  }, [magicIn, sources, getFilteredAndSortedBoxSources]);

  return (
    <React.Fragment>
      {boxes.length > 0 ? (
        boxes.map((src, idx) => {
          const {
            name,
            plaintextOutput: stdout,
            options,
            onClick,
            priority,
          } = src.props;

          const onClickWithCopy = (output: string) => {
            copyText(output);
            onClick(output);
          };

          const showExpand = src.props.showExpandButton !== false;
          return (
            <div
              key={src?.props.name || idx}
              data-testid="magic-box-result"
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
              }}
            >
              {showExpand ? (
                <IconButton
                  aria-label="expand"
                  onClick={() => handleOpenModal(src)}
                  size="small"
                  style={{
                    position: 'absolute',
                    top: '.6rem',
                    right: '.6rem',
                    zIndex: 2,
                    background: 'rgba(255,255,255,0.8)',
                  }}
                >
                  <ZoomOutMapIcon fontSize="small" />
                </IconButton>
              ) : null}
              <src.boxTemplate
                name={name}
                onClick={onClickWithCopy}
                options={options}
                plaintextOutput={stdout}
                priority={priority}
              />
            </div>
          );
        })
      ) : (
        <NotingMatchBoxTemplate />
      )}
      <Modal
        aria-describedby="box-modal-description"
        aria-labelledby="box-modal-title"
        onClose={handleCloseModal}
        open={modalOpen}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            maxWidth: '95vw',
            maxHeight: '90vh',
            width: '100%',
            height: 'auto',
            bgcolor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {modalBox ? (
            <div>
              {(() => {
                const Comp = modalBox.boxTemplate;
                const props = {
                  name: modalBox.props.name,
                  onClick: (output: string) => {
                    copyText(output);
                    modalBox.props.onClick(output);
                  },
                  onClose: handleCloseModal,
                  options: modalBox.props.options,
                  plaintextOutput: modalBox.props.plaintextOutput,
                  priority: modalBox.props.priority,
                };
                if (isLargeSupportBoxComponent(Comp) && Comp.supportsLarge) {
                  return <Comp {...props} largeModal />;
                }
                return <Comp {...props} />;
              })()}
            </div>
          ) : null}
        </Box>
      </Modal>
      <CustomizedSnackbar notify={notify} />
    </React.Fragment>
  );
};

export default MagicBox;
