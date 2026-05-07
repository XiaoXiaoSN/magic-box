import type { Box as BoxType } from '@modules/Box';
import CloseIcon from '@mui/icons-material/Close';
import { Modal } from '@mui/material';

interface BoxModalProps {
  box: BoxType | null;
  open: boolean;
  onClose: () => void;
  onCopy: (text: string) => void;
}

const BoxModal = ({ box, open, onClose, onCopy }: BoxModalProps) => {
  const Comp = box?.boxTemplate;
  if (!box || !Comp) {
    return (
      <Modal aria-labelledby="box-modal-title" onClose={onClose} open={open}>
        <div />
      </Modal>
    );
  }

  const { name, plaintextOutput, options, priority, tag, kind, onClick } =
    box.props;

  const handleClick = (text: string) => {
    onCopy(text);
    onClick(text);
  };

  return (
    <Modal aria-labelledby="box-modal-title" onClose={onClose} open={open}>
      <div className="box-modal-root">
        <button
          aria-label="Close modal backdrop"
          className="box-modal-overlay"
          onClick={onClose}
          tabIndex={-1}
          type="button"
        />
        <div className="box-modal-card">
          <div className="box-modal-head">
            <span aria-hidden="true" className="box-tag">
              {tag ?? '·'}
            </span>
            <h3 className="box-modal-title" id="box-modal-title">
              {name}
            </h3>
            {kind ? <span className="box-kind">{kind}</span> : null}
            <button
              aria-label="Close"
              className="box-modal-close"
              onClick={onClose}
              type="button"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>
          <div className="box-modal-body">
            <Comp
              kind={kind}
              largeModal
              name={name}
              onClick={handleClick}
              onClose={onClose}
              options={options}
              plaintextOutput={plaintextOutput}
              priority={priority}
              tag={tag}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BoxModal;
