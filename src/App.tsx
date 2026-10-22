import AppThemeProvider from '@components/AppThemeProvider';
import BaseLayout from '@components/BaseLayout';
import PwaUpdatePrompt from '@components/PwaUpdatePrompt';
import SettingsPage from '@pages/SettingsPage';
import { lazy, Suspense } from 'react';
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
} from 'react-router-dom';

import { LocaleProvider } from './contexts/LocaleContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { SettingsProvider } from './contexts/SettingsContext';

const MagicBoxPage = lazy(async () => import('@pages/MagicBox'));
const BoxesPage = lazy(async () => import('@pages/Boxes'));

function LegacyListRedirect(): React.JSX.Element {
  const { search, hash } = useLocation();
  return <Navigate replace to={`/boxes${search}${hash}`} />;
}

const renderLoader = () => <div className="loader" />;

const App = (): React.JSX.Element => (
  <LocaleProvider>
    <PreferencesProvider>
      <AppThemeProvider>
        <SettingsProvider>
          <Router>
            <BaseLayout>
              <Suspense fallback={renderLoader()}>
                <Routes>
                  <Route element={<MagicBoxPage />} path="/" />
                  <Route element={<LegacyListRedirect />} path="/list" />
                  <Route element={<BoxesPage />} path="/boxes" />
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
);

export default App;
