import type React from 'react';
import { Link, NavLink } from 'react-router-dom';

const MagicBoxTitle = 'Magic Box';

interface Props {
  children: React.ReactNode;
}

const ListIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="18"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
    width="18"
  >
    <line x1="8" x2="20" y1="6" y2="6" />
    <line x1="8" x2="20" y1="12" y2="12" />
    <line x1="8" x2="20" y1="18" y2="18" />
    <circle cx="4" cy="6" fill="currentColor" r="1.2" />
    <circle cx="4" cy="12" fill="currentColor" r="1.2" />
    <circle cx="4" cy="18" fill="currentColor" r="1.2" />
  </svg>
);

const SettingsIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="18"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.8"
    viewBox="0 0 24 24"
    width="18"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const BaseLayout = ({ children }: Props): React.JSX.Element => (
  <div className="app">
    <header className="topbar" data-testid="header">
      <Link className="brand" to="/" title="Home">
        <span aria-hidden="true" className="brand-mark">
          <img alt="Magic Box" src="/images/logo-512.png" />
        </span>
        <span>{MagicBoxTitle}</span>
      </Link>
      <div className="topbar-right">
        <NavLink
          aria-label="List"
          className={({ isActive }) => `nav-icon${isActive ? ' active' : ''}`}
          title="List"
          to="/list"
        >
          <ListIcon />
        </NavLink>
        <NavLink
          aria-label="Settings"
          className={({ isActive }) => `nav-icon${isActive ? ' active' : ''}`}
          title="Settings"
          to="/settings"
        >
          <SettingsIcon />
        </NavLink>
      </div>
    </header>
    <main className="main">{children}</main>
  </div>
);

export default BaseLayout;
