import { NotingMatchBox } from '@components/Boxes';
import CustomizedSnackbar from '@components/Snackbar';
import copyTextToClipboard from '@functions/clipboard';
import { trim } from '@functions/helper';
import { Box, BoxOptions } from '@modules/Box';
import {
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
  CronExpressionBoxSource,
  GenerateQRCodeBoxSource,
  JWTBoxSource,
  MathExpressionBoxSource,
  MyIPBoxSource,
  NowBoxSource,
  PrettyJSONBoxSource,
  RandomIntegerBoxSource,
  ShortenURLBoxSource,
  TimeFormatBoxSource,
  TimestampBoxSource,
  URLDecodeBoxSource,
} from '@modules/boxes';
import { BoxSource } from '@modules/BoxSource';
import React, { useEffect, useState } from 'react';

const defaultBoxSources: BoxSource[] = [
  Base64DecodeBoxSource,
  Base64EncodeBoxSource,
  CronExpressionBoxSource,
  GenerateQRCodeBoxSource,
  JWTBoxSource,
  MathExpressionBoxSource,
  MyIPBoxSource,
  NowBoxSource,
  PrettyJSONBoxSource,
  RandomIntegerBoxSource,
  ShortenURLBoxSource,
  TimeFormatBoxSource,
  TimestampBoxSource,
  URLDecodeBoxSource,
];

interface Props {
  input: string;
}

const MagicBox = ({ input: magicIn }: Props) => {
  const [notify, setNotify] = useState([0]);
  const [boxes, setBoxes] = useState([] as Box[]);

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

  useEffect(() => {
    if (trim(magicIn) === '') {
      setBoxes([]);
      return;
    }

    const [input, options] = parseInput(magicIn);

    const promises = defaultBoxSources.map((boxSource) => boxSource.generateBoxes(input, options));
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

      // eslint-disable-next-line no-console
      console.log(`input: ${input}\n`, 'boxes:', newBoxes, 'options:', options);
    });
  }, [magicIn]);

  return (
    <>
      {boxes.length > 0 ? (
        boxes.map((src, idx) => {
          const {
            name, stdout, options, onClick, priority,
          } = src.props;

          const onClickWithCopy = (output: string) => {
            copyText(output);
            onClick(output);
          };

          return (
            <div
              data-testid="magic-box-result"
              key={src?.props.name || idx}
              style={{
                width: '100%',
                height: '100%',
              }}
            >
              <src.component
                name={name}
                stdout={stdout}
                options={options}
                onClick={onClickWithCopy}
                priority={priority}
              />
            </div>
          );
        })
      ) : (
        <NotingMatchBox />
      )}
      <CustomizedSnackbar notify={notify} />
    </>
  );
};

export default MagicBox;
