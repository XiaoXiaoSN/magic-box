import App from 'rmw-shell'
import React from 'react'
import config from './config'
import configureStore from './store'


// FontAwesome
import { library } from '@fortawesome/fontawesome-svg-core'
// import { fas } from '@fortawesome/free-solid-svg-icons'
// import { far } from '@fortawesome/free-regular-svg-icons'
import { fab } from '@fortawesome/free-brands-svg-icons'
import { fas } from '@fortawesome/pro-solid-svg-icons'
import { far } from '@fortawesome/pro-regular-svg-icons'
import { fal } from '@fortawesome/pro-light-svg-icons'

library.add(fas, far, fab, fal)


const Main = () => <App appConfig={{ configureStore, ...config }} />

export default Main
