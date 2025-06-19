import React, { lazy, Suspense } from 'react';

import BaseLayout from '@components/BaseLayout';

const MagicBoxPage = lazy(async () => import('@pages/MagicBox'));

const renderLoader = () => <div className="loader" />;

const App = (): React.JSX.Element => (
  <BaseLayout>
    <Suspense fallback={renderLoader()}>
      <MagicBoxPage />
    </Suspense>
  </BaseLayout>
);

export default App;
