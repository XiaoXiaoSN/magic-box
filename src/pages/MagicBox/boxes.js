/* eslint-disable */
import React, { } from 'react'
import { Grid, Paper, Typography } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atelierCaveLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import QRCode from 'qrcode.react';


const boxStyles = makeStyles((theme) => ({
  grid: {
    marginBottom: '.45rem',
  },
  paper: {
    padding: theme.spacing(2),
    color: theme.palette.text.secondary,
    border: '1px solid #cdc9c3',
    borderRadius: '5px',
  },
  paperTypography: {
    textAlign: 'center',
    overflow: 'auto',
  },
  alignCenter: {
    textAlign: 'center',
    overflow: 'auto',
  },
}));

const NotingMatchBox = ({props}) => {
  const classes = boxStyles();

  return (
    <Grid item xs={12} sm={12}>
      <Paper elevation={3} className={classes.paper}>
        <Typography className={classes.paperTypography}> 
          { "nothing match" }
        </Typography>
      </Paper>
    </Grid>
  );
}

const DefaultBox = ({src, clickHook}) => {
  const classes = boxStyles();

  return (
    <Grid item xs={12} sm={12} 
        className={classes.grid}
        zeroMinWidth 
        onClick={(e) => clickHook(src.stdout)} >
      <Paper elevation={3} className={classes.paper}>
        <h3 style={{ margin: 0 }}> 
          { src.name } 
        </h3>
        <Typography className={classes.paperTypography}> 
          { src.stdout } 
        </Typography>
      </Paper>
    </Grid>
  );
}

const CodeBox = ({src, clickHook}) => {
  const classes = boxStyles();

  let language = 'yaml'
  if (('options' in src) && ('language' in src.options)) {
    language = src.options['language']
  }

  return (
    <Grid item xs={12} sm={12} 
        className={classes.grid}
        zeroMinWidth 
        onClick={(e) => clickHook(src.stdout)} >
      <Paper elevation={3} className={classes.paper}>
        <h3 style={{ margin: 0 }}> 
          { src.name } 
        </h3>
        {/* https://react-syntax-highlighter.github.io/react-syntax-highlighter/demo/ */}
        <SyntaxHighlighter language={language} style={atelierCaveLight} customStyle={{ maxHeight: '250px' }}>
          { src.stdout }
        </SyntaxHighlighter>
      </Paper>
    </Grid>
  );
}


const QRCodeBox = ({src, clickHook}) => {
  const classes = boxStyles();

  return (
    <Grid item xs={12} sm={12} 
        className={classes.grid}
        zeroMinWidth 
        onClick={(e) => clickHook(src.stdout)} >
      <Paper elevation={3} className={classes.paper}>
        <h3 style={{ margin: 0 }}> 
          { src.name } 
        </h3>
        {/* https://github.com/zpao/qrcode.react */}
        <div className={classes.alignCenter} id="qrcode-box" >
          <QRCode value={ src.stdout } size={256} includeMargin={true} />
        </div>
      </Paper>
    </Grid>
  );
}

// TODO: 他壞壞
const ShortenURLBox = ({src, clickHook}) => {
  const classes = boxStyles();

  const [status, setStatus] = React.useState(0);
  const [sURL, setSURL] = React.useState('');

  const getShortenURL = async (input) => {
    // TODO: don't hard code host
    const host = 'https://tool.10oz.tw'
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
        setSURL(`${host}/${result['shorten']}`)
      })
      .catch(() => {});
  }

  // call toolbox api to get short url
  React.useEffect(() => { getShortenURL(src.stdout) }, [src.stdout]) 

  return (
    <>
    { status == 200 &&
        <Grid item xs={12} sm={12} 
            className={classes.grid}
            zeroMinWidth 
            onClick={(e) => clickHook(sURL)} >
          <Paper elevation={3} className={classes.paper}>
            <h3 style={{ margin: 0 }}> 
              { src.name }
            </h3>
            <Typography className={classes.paperTypography}> 
              { sURL }
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