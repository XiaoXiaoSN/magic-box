/* eslint-disable */
import React, { } from 'react'
import { Grid } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles';
import { evaluate } from 'mathjs'
import jwt_decode from "jwt-decode";
import { NotingMatchBox, DefaultBox, CodeBox, QRCodeBox, ShortenURLBox } from './boxes'
import CustomizedSnackbars from './snackbar'
import copyTextToClipboard from './functions/clipboard'
import Base64 from './functions/base64'


const useStyles = makeStyles((theme) => ({
  grid: {
    marginBottom: '.45rem',
  },
}));

const MagicBox = (props) => {
  const classes = useStyles();
  
  const [notify, setNotify] = React.useState([0]);
  const [source, setSource] = React.useState([])
  const defaultFuncs = [
    checkCommand,
    checkTimestamp,
    checkTimeFormat,
    checkJWT,
    checkMathExpressions,
    checkBase64,
    checkCanBeBase64,
  ]

  React.useEffect(() => {
    if (trim(props.in) === "") {
      setSource([])
      return 
    }

    let [input, options] = inputParser(props.in)

    let resp = []
    for (let f of funcPreparer(defaultFuncs, options)) {
      let box = f(input, options)
      if (box === null) {
        continue
      }

      if (isArray(box)) {
        resp.push(...box)
      } else {
        resp.push(box)
      }
    }

    resp = resp.filter(x => x !== undefined).filter(x => x !== null)
    setSource(resp)
    console.log('input:', input, 'source:', resp, 'options:', options)

  }, [props.in])

  const copyText = (text) => {
    copyTextToClipboard(text)
    setNotify([Date.now()])
  }

  return (
    <Grid container item xs={12} sm={12} md={6}
            style={{ background: "#f5f5f5", overflow: "scroll", maxHeight: "calc(100vh - 100px)" }} >

      {
        source.length > 0 ? 
          source.map( (src, idx) => {
            if ('component' in src) {
              return <src.component src={src} clickHook={copyText} key={idx} />
            }
            return <DefaultBox src={src} clickHook={copyText} key={idx} />
          }) : ( <NotingMatchBox/> )
      }

      <CustomizedSnackbars notify={notify} />
    </Grid>
  )
}

// ************************************************************ 
// *  Start to prepare MagicBox Functions 
// ************************************************************

let inputParser = (input) => {
  const regex = /\n::([\w=]+)/gm;
  const matches = Array.from(input.matchAll(regex), m => m[1]);
  
  var options = {}
  matches
    .map(k => k.toLowerCase())
    .map(k => options[k] = true)

  input = input.replaceAll(regex, '')

  return [input, options]
}

let isOptionKeys = (options, ...keys) => {
  keys = keys.map(k => k.toLowerCase())

  try {
    for (let key of keys) {
      if (options[key] === true) {
        return true
      }
    }
  } catch {}

  return false
}

let funcPreparer = (defaultFuncs, options) => {
  let funcs = [];

  if (isOptionKeys(options, 'qrcode', 'qr')) {
    funcs.push(takeQRCode)
  }
  if (isOptionKeys(options, 'surl', 'shorten')) {
    funcs.push(takeShortenURL)
  }

  funcs.push(...defaultFuncs)

  return funcs
}

// ************************************************************ 
// *  Start to Define MagicBox Functions 
// ************************************************************

let checkCommand = (input) => {
  if (!isString(input)) {
    return null
  }
  input = trim(input)

  switch (input.toLowerCase()) {
    case 'now':
      let ts = Date.now()
      let tzOffset = (8 * 60 * 60) * 1000
      let twDate = new Date(ts + tzOffset)
      return [
        {
          'name': 'RFC 3339 (UTC+8)',
          'stdout': twDate.toISOString().replace("Z", "+08:00"),
          'priority': 10,
        },
        {
          'name': 'timestamp (s)',
          'stdout': ts / 1000,
        }
      ]

    default:
      const randomRegex = /^random(\d*)$/i
      let found = input.match(randomRegex)
      if (found && found.length > 0) {
        let len = 8
        
      }

      return null
  }
}

let checkTimestamp = (input) => {
  if (!isNumeric(input)) {
    return null
  }
  
  try {
    let date = new Date(parseFloat(input) * 1000)
    let tzOffset = (8 * 60 * 60) * 1000
    let twDate = new Date(parseFloat(input) * 1000 + tzOffset)

    // check max and min timestamp
    const minTimestamp = new Date(1600, 1, 1, 0, 0, 0, 0)
    const maxTimestamp = new Date(2050, 12, 31, 23, 59, 59, 0)
    if (date.getTime() < minTimestamp) {
      return []
    } else if (date.getTime() > maxTimestamp) {
      // guess the big number is a timestamp in ms, convert ms to sec
      date = new Date(parseFloat(input))
      twDate = new Date(parseFloat(input) + tzOffset)
      if (date.getTime() > maxTimestamp || date.getTime() < minTimestamp) {
        return []
      }
    }

    let resp = [] 
    if (date.getTime() > 0) {
      resp.push({
        'name': 'RFC 3339',
        'stdout': date.toISOString(),
      })
    }
    if (twDate.getTime() > 0) {
      resp.push({
        'name': 'RFC 3339 (UTC+8)',
        'stdout': twDate.toISOString().replace("Z", "+08:00"),
        'priority': 10,
      })
    }
    return resp

  } catch {}

  return null
}

let checkTimeFormat = (input) => {
  if (!isString(input)) {
    return null
  }
  input = trim(input)

  if (!isRFC3339(input)) {
    return null
  }

  try {
    let ts = Date.parse(input);
    if (ts > 0) {
      return [
        {
          'name': 'timestamp (s)',
          'stdout': ts / 1000,
        },
        {
          'name': 'timestamp (ms)',
          'stdout': ts,
        }
      ]
    }
  } catch {
    return null
  }
  return null
}

let checkJWT = (input) => {
  input = trim(input)

  try {
    let jwtHeader = jwt_decode(input, { header: true })
    let jwtBody = jwt_decode(input)
    let jwtStr = JSON.stringify({ 'header': jwtHeader, 'body': jwtBody }, null, "    ")

    return {
      'name': 'JWT Decode',
      'stdout': jwtStr,
      'component': CodeBox,
      'options': {'language': 'json'},
    }
  } catch {}

  return null
}

let checkMathExpressions = (input) => {
  if (!isString(input)) {
    return null
  }
  if (input === '' || trim(input) === '') {
    return null 
  }

  input = trim(input)

  try {
    let ans = evaluate(input)
    if (ans === null || typeof(ans) === 'object' || typeof(ans) === 'function') {
      return null
    }

    if (typeof(ans) === 'boolean') {
      ans = ans.toString()
    }

    return {
      'name': 'Math Expressions',
      'stdout': ans,
    }
  } catch {}

  return null
}

let checkBase64 = (input, options) => {
  if (!isString(input)) {
    return null
  }
  input = trim(input)

  if (!isBase64(input)) {
    return null
  }

  try {
      let decodeText = Base64.decode(input)

      let _options = {}
      optionTaking: try {
        if (!isObject(options)) {
          break optionTaking
        }

        // check for language setting
        const langKeys = ['l', 'lang', 'language']
        for (const option in options) {
          for (const langKey of langKeys) {
            if (option.indexOf(langKey+'=') === 0) {
              _options.language = option.substr((langKey+'=').length)
            }
          }
        }
      } catch (e) { console.error('checkBase64 optionTaking failed', e) }

      return {
        'name': 'Base64 decode',
        'stdout': decodeText,
        'component': CodeBox,
        'options': _options,
      }
  } catch (e) {
    console.error('checkBase64', e)
  }

  return null
}

let checkCanBeBase64 = (input) => {
  if (!isString(input)) {
    return null
  }
  if (input === '' || trim(input) === '') {
    return null
  }

  try {
      return {
        'name': 'Base64 encode',
        'stdout': Base64.encode(input),
      }
  } catch {}

  return null
}

let takeQRCode = (input) => {
  if (!isString(input)) {
    return null
  }
  if (input === '' || trim(input) === '') {
    return null 
  }

  try {
      return {
        'name': 'QRCode',
        'stdout': input,
        'component': QRCodeBox,
      }
  } catch {}

  return null
}

let takeShortenURL = (input) => {
  if (!isString(input)) {
    return null
  }
  if (input === '' || trim(input) === '') {
    return null
  }

  try {
      return {
        'name': 'Shorten URL',
        'stdout': input,
        'component': ShortenURLBox,
      }
  } catch {}

  return null
}


// ************************************************************ 
// *  Util Function
// ************************************************************

const isNumeric = (num) => {
  return (typeof(num) === 'number' || typeof(num) === 'string' && num.trim() !== '') && !isNaN(num);
}

const isString = (str) => {
  return typeof(str) === 'string'
}

const isArray = (foo) => {
  return Array.isArray(foo)
}

const isObject = (foo) => {
  return typeof foo === 'object' && foo !== null
}

const trim = (str) => {
  return str.replace(/^\s+|\s+$/g, '');
}

const isRFC3339 = (str) => {
  const re = /^(\d+)-(0[1-9]|1[012])-(0[1-9]|[12]\d|3[01])[\sT]([01]\d|2[0-3]):([0-5]\d):([0-5]\d|60)(\.\d+)?(([Zz])|([\+|\-]([01]\d|2[0-3])):[0-5]\d)$/gm;

  if (!isString(str)) {
    return false
  }
  return str.match(re) ? true : false
}

const isBase64 = (str) => {
  const re = /^[A-Za-z0-9+/=]+$/m

  if (str === '' || str.trim() === '') { 
    return false; 
  }
  return str.match(re) ? true : false 
}


export default MagicBox