import AppThemeProvider from '@components/AppThemeProvider';
import BaseLayout from '@components/BaseLayout';
import ErrorBoundary, { RootErrorFallback } from '@components/ErrorBoundary';
import PwaUpdatePrompt from '@components/PwaUpdatePrompt';
import SettingsPage from '@pages/SettingsPage';
import { lazy, Suspense } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import { LocaleProvider } from './contexts/LocaleContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { SettingsProvider } from './contexts/SettingsContext';

const MagicBoxPage = lazy(async () => import('@pages/MagicBox'));
const ToolsListPage = lazy(async () => import('@pages/ToolsList'));

const renderLoader = () => <div className="loader" />;

const App = (): React.JSX.Element => (
  <ErrorBoundary fallback={(retry) => <RootErrorFallback retry={retry} />}>
    <LocaleProvider>
      <PreferencesProvider>
        <AppThemeProvider>
          <SettingsProvider>
            <Router>
              <BaseLayout>
                <Suspense fallback={renderLoader()}>
                  <Routes>
                    <Route element={<MagicBoxPage />} path="/" />
                    <Route element={<ToolsListPage />} path="/list" />
                    <Route element={<SettingsPage />} path="/settings" />
                  </Routes>
                </Suspense>
                <PwaUpdatePrompt />
              </BaseLayout>
            </Router>
          </SettingsProvider>
        </AppThemeProvider>
      </PreferencesProvider>
    </LocaleProvider>
  </ErrorBoundary>
);

export default App;
