import BaseLayout from '@components/BaseLayout';
import React, { lazy, Suspense } from 'react';

const MagicBoxPage = lazy(() => import('@pages/MagicBox'));

const renderLoader = () => <div className="loader" />;

const App = () => (
  <BaseLayout>
    <Suspense fallback={renderLoader()}>
      <MagicBoxPage />
    </Suspense>
  </BaseLayout>
);

export default App;
