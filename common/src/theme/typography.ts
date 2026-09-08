import { TypographyVariantsOptions } from '@mui/material/styles'

export const typography = {
  fontFamily: [
    '"Inter"',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"'
  ].join(','),
  h1: {
    fontSize: 45,
    fontWeight: 600,
    lineHeight: 1.156,
    letterSpacing: '0'
  },
  h2: {
    fontSize: 32,
    fontWeight: 600,
    lineHeight: 1.25,
    letterSpacing: '0'
  },
  h3: {
    fontSize: 24,
    fontWeight: 600,
    lineHeight: 1.333,
    letterSpacing: '0'
  },
  h4: {
    fontSize: 22,
    fontWeight: 600,
    lineHeight: 1.273,
    letterSpacing: '0'
  },
  h5: {
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1.5,
    letterSpacing: '0'
  },
  h6: {
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.429,
    letterSpacing: '0'
  },
  subtitle1: {
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.143,
    letterSpacing: '0.5px'
  },
  subtitle2: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.429,
    letterSpacing: '0.25px'
  },
  body1: {
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '-0.15px'
  },
  body2: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.429,
    letterSpacing: '0.25px'
  },
  button: {
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.429,
    textTransform: 'none',
    letterSpacing: '0.1px'
  },
  buttonLarge: {
    fontSize: 16,
    fontWeight: 500,
    lineHeight: 1.5,
    textTransform: 'none',
    letterSpacing: '0.15px'
  },
  buttonSmall: {
    fontSize: 11,
    fontWeight: 500,
    lineHeight: 1.455,
    textTransform: 'none',
    letterSpacing: '0.5px'
  },
  caption: {
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.333,
    letterSpacing: '0.5px'
  },
  overline: {
    fontSize: 11,
    fontWeight: 500,
    lineHeight: 1.455,
    letterSpacing: '0.4px',
    textTransform: 'none'
  }
} as TypographyVariantsOptions
