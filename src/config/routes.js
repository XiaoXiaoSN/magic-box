/* eslint-disable */
/* eslint-disable react/jsx-key */
import React from 'react'
import { Route } from 'react-router-dom'
import RestrictedRoute from 'rmw-shell/lib/containers/RestrictedRoute'
import makeLoadable from 'rmw-shell/lib/containers/MyLoadable'

const MyLoadable = (opts, preloadComponents) =>
  makeLoadable(
    { ...opts, firebase: () => import('./firebase') },
    // preloadComponents
  )
const AsyncMagicBox = MyLoadable({ loader: () => import('../pages/MagicBox') })
// const AsyncHome = MyLoadable({ loader: () => import('../pagesDemo/Dashboard') })

const routes = [
  <RestrictedRoute type="public" path="/" exact component={AsyncMagicBox} />,
  // <RestrictedRoute type="public" path="/demo" exact component={AsyncHome} />,
]

export default routes
