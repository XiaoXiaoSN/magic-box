/* eslint-disable */
import React, { useEffect, useState } from 'react'
import { Grid } from '@mui/material';
import { evaluate } from 'mathjs'
import jwt_decode from "jwt-decode";
import { NotingMatchBox, DefaultBox, CodeBox, QRCodeBox, ShortenURLBox } from './boxes'
import CustomizedSnackbar from './snackbar'
import { copyTextToClipboard, Base64 } from './functions'

/*
 * Define box priorities
 */
const PriorityRFC3339 = 9
const PriorityURLEncode = 10

const MagicBox = (props) => {
  const [notify, setNotify] = useState([0])
  const [source, setSource] = useState([])
  const defaultFuncs = [
    checkCommand,
    checkTimestamp,
    checkTimeFormat,
    checkJWT,
    checkMathExpressions,
    checkBase64,
    checkCanBeBase64,
    checkURLDecode,
    checkNeedPrettyJSON,
  ]

  useEffect(() => {
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

    resp = resp.
      filter(x => (x !== undefined && x !== null)).
      sort((a, b) => {
        let priorityA = 0, priorityB = 0
        if ('priority' in a) {
          priorityA = a['priority']
        }
        if ('priority' in b) {
          priorityB = b['priority']
        }
        return priorityB - priorityA
      }).
      map(x => {
        let p = 0
        if ('priority' in x) {
          p = x.priority
        }
        return x
      })
    setSource(resp)
    console.log('input:', input, 'source:', resp, 'options:', options)

  }, [props.in])

  const copyText = (text) => {
    copyTextToClipboard(text)
    setNotify([Date.now()])
  }

  return (
    <>
      {
        source.length > 0 ?
          source.map((src, idx) => {
            if ('component' in src) {
              return <src.component src={src} clickHook={copyText} key={src?.name || idx} />
            }
            return <DefaultBox src={src} clickHook={copyText} key='default' />
          })
          : <NotingMatchBox/>
      }
      <CustomizedSnackbar notify={notify} />
    </>
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
          'priority': PriorityRFC3339,
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
        'priority': PriorityRFC3339,
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

let checkURLDecode = (input, options) => {
  if (!isString(input)) {
    return null
  }
  input = trim(input)

  try {
      let decodeText = decodeURIComponent(input)
      if (decodeText == input) {
        return null
      }

      return {
        'name': 'URLEncode decode',
        'stdout': decodeText,
        'priority': PriorityURLEncode,
      }
  } catch (e) {
    console.error('checkURLDecode', e)
  }

  return null
}

let checkNeedPrettyJSON = (input, options) => {
  if (!isString(input)) {
    return null
  }
  if (input === '' || trim(input) === '') {
    return null
  }
  if (!isJSON(input)) {
    return null
  }

  try {
    let jsonStr = JSON.stringify(JSON.parse(input), null, "    ")
    if (jsonStr === null) {
      return null
    }
    if (jsonStr == input) {
      return null
    }

    return {
      'name': 'Pretty JSON',
      'stdout': jsonStr,
      'component': CodeBox,
      'options': {'language': 'json'},
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
// *  Util Functions
// ************************************************************

const isNumeric = (num) => {
  return (typeof(num) === 'number' || typeof(num) === 'string' && num.trim() !== '') && !isNaN(num)
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
  return str.replace(/^\s+|\s+$/g, '')
}

const isRFC3339 = (str) => {
  const re = /^(\d+)-(0[1-9]|1[012])-(0[1-9]|[12]\d|3[01])[\sT]([01]\d|2[0-3]):([0-5]\d):([0-5]\d|60)(\.\d+)?(([Zz])|([\+|\-]([01]\d|2[0-3])):[0-5]\d)$/gm;

  if (!isString(str)) {
    return false
  }
  return str.match(re) ? true : false
}

const isBase64 = (str) => {
  // https://stackoverflow.com/a/7874175/6695274
  /*
   *   ^                          # Start of input
   *   ([0-9a-zA-Z+/]{4})*        # Groups of 4 valid characters decode
   *                              # to 24 bits of data for each group
   *   (                          # Either ending with:
   *       ([0-9a-zA-Z+/]{2}==)   # two valid characters followed by ==
   *       |                      # , or
   *       ([0-9a-zA-Z+/]{3}=)    # three valid characters followed by =
   *   )?                         # , or nothing
   *   $                          # End of input
  */
  const re = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/m
  if (str === '' || str.trim() === '') {
    return false
  }
  return str.match(re) ? true : false
}

const isJSON = (str) => {
  // https://stackoverflow.com/a/3710506/6695274
  if (/^[\],:{}\s]*$/.test(str.replace(/\\["\\\/bfnrtu]/g, '@').
    replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
    replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
      return true
  }
  return false
}

export default MagicBox
