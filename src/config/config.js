/* eslint-disable */
import React from 'react'
import Loadable from 'react-loadable'
import getMenuItems from './menuItems'
import LoadingComponent from 'rmw-shell/lib/components/LoadingComponent'
import locales from './locales'
import routes from './routes'
import themes from './themes'
import grants from './grants'
import parseLanguages from 'rmw-shell/lib/utils/localeTools'

const Loading = () => <LoadingComponent />

const LPAsync = Loadable({
  loader: () => import('../../src/pages/LandingPage'),
  loading: Loading,
})

const config = {
  firebase_config: {
    apiKey: "AIzaSyD5PZXqBNbQaBuD7udFJFTG0UBiZCjRYqo",
    authDomain: "magic-box-b8bdc.firebaseapp.com",
    databaseURL: "https://magic-box-b8bdc.firebaseio.com",
    projectId: "magic-box-b8bdc",
    storageBucket: "magic-box-b8bdc.appspot.com",
    messagingSenderId: "410691114194",
    appId: "1:410691114194:web:750542997e84e55a55890b"
  },
  firebase_providers: [
    // 'google.com',
    // 'facebook.com',
    // 'twitter.com',
    // 'github.com',
    'password',
    // 'phone',
  ],
  googleMaps: {
    apiKey: 'AIzaSyByMSTTLt1Mf_4K1J9necAbw2NPDu2WD7g',
  },
  initial_state: {
    themeSource: {
      isNightModeOn: true,
      source: 'light',
    },
    locale: parseLanguages(['en', 'bs', 'es', 'ru', 'de', 'it', 'fr', 'pt'], 'en'),
  },
  drawer_width: 256,
  locales,
  themes,
  grants,
  routes,
  getMenuItems,
  firebaseLoad: () => import('./firebase'),
  // landingPage: LPAsync,
}

export default config
