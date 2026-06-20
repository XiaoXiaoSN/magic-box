import { memo } from 'react';
import { useLocale } from '../../contexts/LocaleContext';

const NotingMatchBoxTemplate = memo((): React.JSX.Element => {
  const { t } = useLocale();

  return (
    <div className="empty" data-testid="magic-box-empty">
      <div aria-hidden="true" className="empty-mark" />
      <div className="empty-title">{t('magicBox.emptyStartTitle')}</div>
      <div className="empty-sub">{t('magicBox.emptyStartSub')}</div>
    </div>
  );
});

export default NotingMatchBoxTemplate;
