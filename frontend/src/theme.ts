import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#646cff' },
    secondary: { main: '#ffb300', contrastText: '#ffffff' },  // friendlier amber
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
  typography: {
    fontFamily: ['Roboto','Helvetica','Arial','sans-serif'].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',     // no all‑caps
          borderRadius: 8,           // extra rounding
        }
      }
    },
    MuiAppBar: { styleOverrides: { root: { boxShadow: 'none' } } },
    MuiPaper: { defaultProps: { elevation: 1 } },
  }
});

export default theme;
