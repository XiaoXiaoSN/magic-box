import red from '@material-ui/core/colors/red'
// import pink from '@material-ui/core/colors/pink'
import green from '@material-ui/core/colors/green'
// import blue from '@material-ui/core/colors/blue'

const themes = [
  // {
  //   id: 'default',
  //   color: blue[500],
  //   source: {
  //     typography: {
  //       fontFamily: 'Baloo Tammudu 2',
  //     },
    
  //   }
  // },
  // {
  //   id: 'red',
  //   color: red[500],
  //   source: {
  //     typography: {
  //       fontFamily: 'Baloo Tammudu 2',
  //     },
  //     palette: {
  //       primary: red,
  //       secondary: pink,
  //       error: red
  //     }
  //   }
  // },
  {
    id: 'default',
    color: green[500],
    source: {
      typography: {
        fontFamily: '"Baloo Tammudu 2"',
      },
      palette: {
        primary: '#6c6dac',
        secondary: "#c75c5c",
        error: red
      }
    }
  }
]

export default themes
