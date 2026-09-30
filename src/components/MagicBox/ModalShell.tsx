import CloseIcon from '@mui/icons-material/Close';
import { Modal } from '@mui/material';

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  // Ties the dialog's accessible name to the visible heading.
  titleId: string;
  title: React.ReactNode;
  tag?: React.ReactNode;
  kind?: React.ReactNode;
  closeLabel: string;
  backdropLabel: string;
  // Prefixes the overlay and close button test ids: `${testId}-overlay`.
  testId?: string;
  children: React.ReactNode;
}

// The card-style modal chrome shared by the expanded box view and the Local AI
// settings dialog: backdrop button, head with tag/title/kind, close button.
const ModalShell = ({
  open,
  onClose,
  titleId,
  title,
  tag,
  kind,
  closeLabel,
  backdropLabel,
  testId,
  children,
}: ModalShellProps) => (
  <Modal aria-labelledby={titleId} onClose={onClose} open={open}>
    <div className="box-modal-root">
      <button
        aria-label={backdropLabel}
        className="box-modal-overlay"
        data-testid={testId ? `${testId}-overlay` : undefined}
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <div className="box-modal-card">
        <div className="box-modal-head">
          <span aria-hidden="true" className="box-tag">
            {tag ?? '·'}
          </span>
          <h3 className="box-modal-title" id={titleId}>
            {title}
          </h3>
          {kind ? <span className="box-kind">{kind}</span> : null}
          <button
            aria-label={closeLabel}
            className="box-modal-close"
            data-testid={testId ? `${testId}-close` : undefined}
            onClick={onClose}
            type="button"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>
        <div className="box-modal-body">{children}</div>
      </div>
    </div>
  </Modal>
);

export default ModalShell;
