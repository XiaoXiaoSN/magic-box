/* eslint-disable */
import React, { } from 'react'
import { Grid, Paper, Typography } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atelierCaveLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';


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
  }
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
        <SyntaxHighlighter language="yaml" style={atelierCaveLight} customStyle={{ maxHeight: '250px' }}>
          { src.stdout }
        </SyntaxHighlighter>
      </Paper>
    </Grid>
  );
}

export {
  NotingMatchBox,
  DefaultBox,
  CodeBox,
}