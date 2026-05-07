import { memo } from 'react';

const NotingMatchBoxTemplate = memo(
  (): React.JSX.Element => (
    <div className="empty" data-testid="magic-box-empty">
      <div aria-hidden="true" className="empty-mark" />
      <div className="empty-title">Start typing</div>
      <div className="empty-sub">
        MagicBox auto-detects formats and shows every useful transformation.
      </div>
    </div>
  ),
);

export default NotingMatchBoxTemplate;
