import { resolveBoxTemplate } from '@components/BoxTemplate/resolveBoxTemplate';
import ErrorBoundary, {
  TemplateErrorFallback,
} from '@components/ErrorBoundary';
import type { Box as BoxType } from '@modules/Box';
import { Modal } from '@mui/material';
import { memo, Suspense, useCallback } from 'react';
import { useLocale } from '../../contexts/LocaleContext';
import ModalShell from './ModalShell';

interface BoxModalProps {
  box: BoxType | null;
  open: boolean;
  onClose: () => void;
  onCopy: (text: string) => Promise<boolean>;
  onInputCommit?: () => void;
}

const BoxModal = memo(
  ({ box, open, onClose, onCopy, onInputCommit }: BoxModalProps) => {
    const { t } = useLocale();
    const Comp = box ? resolveBoxTemplate(box) : null;
    const onClick = box?.props.onClick;
    const handleClick = useCallback(
      (text: string): void => {
        void onCopy(text)
          .then((copied) => {
            if (copied) onInputCommit?.();
          })
          .catch(() => undefined);
        onClick?.(text);
      },
      [onClick, onCopy, onInputCommit],
    );
    if (!box || !Comp) {
      return (
        <Modal aria-labelledby="box-modal-title" onClose={onClose} open={open}>
          <div />
        </Modal>
      );
    }

    const { name, plaintextOutput, options, sourceInput, priority, tag, kind } =
      box.props;

    return (
      <ModalShell
        backdropLabel={t('boxModal.closeBackdrop')}
        closeLabel={t('boxModal.close')}
        kind={kind}
        onClose={onClose}
        open={open}
        tag={tag}
        title={name}
        titleId="box-modal-title"
      >
        <ErrorBoundary
          fallback={(retry) => <TemplateErrorFallback retry={retry} />}
          resetKey={box}
        >
          <Suspense fallback={null}>
            <Comp
              kind={kind}
              largeModal
              name={name}
              onClick={handleClick}
              onClose={onClose}
              options={options}
              plaintextOutput={plaintextOutput}
              priority={priority}
              sourceInput={sourceInput}
              tag={tag}
            />
          </Suspense>
        </ErrorBoundary>
      </ModalShell>
    );
  },
);

BoxModal.displayName = 'BoxModal';

export default BoxModal;
