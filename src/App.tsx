import AppThemeProvider from '@components/AppThemeProvider';
import BaseLayout from '@components/BaseLayout';
import ErrorBoundary, {
  RootErrorFallback,
  retryableLazy,
} from '@components/ErrorBoundary';
import PwaUpdatePrompt from '@components/PwaUpdatePrompt';
import { Suspense } from 'react';
import {
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
} from 'react-router-dom';
import { InputDraftProvider } from './contexts/InputDraftContext';
import { LocaleProvider } from './contexts/LocaleContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { SettingsProvider } from './contexts/SettingsContext';

const MagicBoxPage = retryableLazy(() => import('@pages/MagicBox'));
const SettingsPage = retryableLazy(() => import('@pages/SettingsPage'));
const ToolsListPage = retryableLazy(() => import('@pages/ToolsList'));

const renderLoader = () => <div className="loader" />;

const FeatureRoutes = (): React.JSX.Element => {
  const location = useLocation();
  return (
    <ErrorBoundary
      fallback={({ retry }) => <RootErrorFallback as="div" retry={retry} />}
      resetKey={location.key}
    >
      <Suspense fallback={renderLoader()}>
        <Routes>
          <Route element={<MagicBoxPage />} path="/" />
          <Route element={<ToolsListPage />} path="/list" />
          <Route element={<SettingsPage />} path="/settings" />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

const App = (): React.JSX.Element => (
  <ErrorBoundary fallback={({ retry }) => <RootErrorFallback retry={retry} />}>
    <LocaleProvider>
      <PreferencesProvider>
        <AppThemeProvider>
          <SettingsProvider>
            <Router>
              <InputDraftProvider>
                <BaseLayout>
                  <FeatureRoutes />
                  <PwaUpdatePrompt />
                </BaseLayout>
              </InputDraftProvider>
            </Router>
          </SettingsProvider>
        </AppThemeProvider>
      </PreferencesProvider>
    </LocaleProvider>
  </ErrorBoundary>
);

export default App;
