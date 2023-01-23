/* eslint-disable */
import React, { useEffect, useState } from 'react'
import { Grid, Paper, Typography } from '@mui/material'
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atelierCaveLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import QRCode from 'qrcode.react';


const boxStyles = {
  grid: {
    marginBottom: '.45rem',
  },
  paper: (theme) => ({
    padding: theme.spacing(2),
    color: theme.palette.text.secondary,
    border: '1px solid #cdc9c3',
    borderRadius: '5px',
  }),
  paperTypography: {
    textAlign: 'center',
    overflow: 'auto',
  },
  alignCenter: {
    textAlign: 'center',
    overflow: 'auto',
  },
};

const NotingMatchBox = () => {
  return (    
    <Grid item xs={12} sm={12} 
        sx={boxStyles.grid}
        zeroMinWidth>
      <Paper elevation={3} sx={boxStyles.paper}>
        <Typography sx={boxStyles.paperTypography}>
          { 'nothing match' }
        </Typography>
      </Paper>
    </Grid>
  );
}

const DefaultBox = ({ src, clickHook }) => {
  return (
    <Grid item xs={12} sm={12}
        sx={boxStyles.grid}
        zeroMinWidth
        onClick={(e) => clickHook(src.stdout)} >
      <Paper elevation={3} sx={boxStyles.paper}>
        <h3 style={{ margin: 0 }}>
          { src.name }
        </h3>
        <Typography sx={boxStyles.paperTypography}>
          { src.stdout }
        </Typography>
      </Paper>
    </Grid>
  );
}

const CodeBox = ({ src, clickHook }) => {
  let language = 'yaml'
  if (('options' in src) && ('language' in src.options)) {
    language = src.options['language']
  }

  return (
    <Grid item
        xs={12} sm={12}
        sx={boxStyles.grid}
        zeroMinWidth
        onClick={(e) => clickHook(src.stdout)} >
      <Paper elevation={3} sx={boxStyles.paper}>
        <h3 style={{ margin: 0 }}>
          { src.name }
        </h3>
        {/* https://react-syntax-highlighter.github.io/react-syntax-highlighter/demo/ */}
        <SyntaxHighlighter language={language} sx={atelierCaveLight} customStyle={{ maxHeight: '250px' }}>
          { src.stdout }
        </SyntaxHighlighter>
      </Paper>
    </Grid>
  );
}

const QRCodeBox = ({ src, clickHook }) => {
  return (
    <Grid item xs={12} sm={12}
        sx={boxStyles.grid}
        zeroMinWidth
        onClick={(e) => clickHook(src.stdout)} >
      <Paper elevation={3} sx={boxStyles.paper}>
        <h3 style={{ margin: 0 }}>
          { src.name }
        </h3>
        {/* https://github.com/zpao/qrcode.react */}
        <div sx={boxStyles.alignCenter} id="qrcode-box" >
          <QRCode value={ src.stdout } size={256} includeMargin={true} />
        </div>
      </Paper>
    </Grid>
  );
}

const ShortenURLBox = ({ src, clickHook }) => {
  const [status, setStatus] = useState(0);
  const [shortURL, setShortURL] = useState('');

  const getShortenURL = async (input) => {
    const host = process.env.TOOLBOX ?? 'https://tool.10oz.tw'
    let payload = {
      "url": input,
    }
    await fetch(`${host}/api/v1/surl`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
      .then(resp => {
        if (resp.status !== 200) {
          setStatus(resp.status)
          return
        }
        return resp.json()
      })
      .then(result => {
        if (result == null || !isString(result['shorten']) || result['shorten'] === '') {
          setStatus(400001)
          return
        }

        setStatus(200)
        setShortURL(`${host}/${result['shorten']}`)
      })
      .catch(() => {});
  }

  // call toolbox api to get short url
  useEffect(() => { getShortenURL(src.stdout) }, [src.stdout])

  return (
    <>
    { status == 200 &&
        <Grid item xs={12} sm={12}
            sx={boxStyles.grid}
            zeroMinWidth
            onClick={(e) => clickHook(shortURL)} >
          <Paper elevation={3} sx={boxStyles.paper}>
            <h3 style={{ margin: 0 }}>
              { src.name }
            </h3>
            <Typography sx={boxStyles.paperTypography}>
              { shortURL }
            </Typography>
          </Paper>
        </Grid>
    }
    </>
  );
}

const isString = (str) => {
  return typeof(str) === 'string'
}

export {
  NotingMatchBox,
  DefaultBox,
  CodeBox,
  QRCodeBox,
  ShortenURLBox,
}
