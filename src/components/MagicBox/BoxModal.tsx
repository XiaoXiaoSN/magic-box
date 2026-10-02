import { resolveBoxTemplate } from '@components/BoxTemplate/resolveBoxTemplate';
import type { Box as BoxType } from '@modules/Box';
import { Modal } from '@mui/material';
import { useLocale } from '../../contexts/LocaleContext';
import ModalShell from './ModalShell';

interface BoxModalProps {
  box: BoxType | null;
  open: boolean;
  onClose: () => void;
  onCopy: (text: string) => void;
}

const BoxModal = ({ box, open, onClose, onCopy }: BoxModalProps) => {
  const { t } = useLocale();
  const Comp = box ? resolveBoxTemplate(box) : null;
  if (!box || !Comp) {
    return (
      <Modal aria-labelledby="box-modal-title" onClose={onClose} open={open}>
        <div />
      </Modal>
    );
  }

  const {
    name,
    plaintextOutput,
    options,
    sourceInput,
    priority,
    tag,
    kind,
    onClick,
  } = box.props;

  const handleClick = (text: string) => {
    onCopy(text);
    onClick(text);
  };

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
    </ModalShell>
  );
};

export default BoxModal;
