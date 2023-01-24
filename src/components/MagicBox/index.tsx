import {
  DefaultBox, NotingMatchBox,
} from '@components/Boxes';
import CustomizedSnackbar from '@components/Snackbar';
import copyTextToClipboard from '@functions/clipboard';
import {
  trim,
} from '@functions/helper';
import { BoxSource } from '@modules/box';
import React, { useEffect, useState } from 'react';

import {
  defaultFuncs,
  funcPreparer,
  inputParser,
} from './checks';

interface Props {
  in: string,
}

const MagicBox = ({ in: propsIn }: Props) => {
  const [notify, setNotify] = useState([0]);
  const [source, setSource] = useState([] as BoxSource[]);

  useEffect(() => {
    if (trim(propsIn) === '') {
      setSource([]);
      return;
    }

    const [input, options] = inputParser(propsIn);

    let boxes: BoxSource[] = [];
    const functions = funcPreparer(defaultFuncs, options);
    functions.forEach((f) => {
      const box = f(input, options);
      if (box && box.length > 0) {
        boxes.push(...box);
      }
    });

    boxes = boxes
      .filter((box) => !!box)
      .sort((a, b) => {
        const priorityA = a.priority ?? 0;
        const priorityB = b.priority ?? 0;

        return priorityB - priorityA;
      })
      .map((box) => {
        const updatedBox = box;
        updatedBox.priority = box.priority ?? 0;
        return updatedBox;
      });

    setSource(boxes);

    console.log(`input: ${input}\n`, 'source:', boxes, 'options:', options);
  }, [propsIn]);

  const copyText = (text: string) => {
    copyTextToClipboard(text);
    setNotify([Date.now()]);
  };

  return (
    <>
      {
        source.length > 0
          ? source.map((src, idx) => {
            if (src.component) {
              return <src.component src={src} clickHook={copyText} key={src?.name || idx} />;
            }
            return <DefaultBox src={src} clickHook={copyText} key="default" />;
          })
          : <NotingMatchBox />
      }
      <CustomizedSnackbar notify={notify} />
    </>
  );
};

export default MagicBox;
