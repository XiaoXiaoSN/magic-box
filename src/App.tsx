import React, { lazy, Suspense } from 'react';

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import BaseLayout from '@components/BaseLayout';
import SettingsPage from '@pages/SettingsPage';

const MagicBoxPage = lazy(async () => import('@pages/MagicBox'));
const ToolsListPage = lazy(async () => import('@pages/ToolsList'));

const renderLoader = () => <div className="loader" />;

const App = (): React.JSX.Element => (
  <Router>
    <BaseLayout>
      <Suspense fallback={renderLoader()}>
        <Routes>
          <Route element={<MagicBoxPage />} path="/" />
          <Route element={<ToolsListPage />} path="/list" />
          <Route element={<SettingsPage />} path="/settings" />
        </Routes>
      </Suspense>
    </BaseLayout>
  </Router>
);

export default App;
