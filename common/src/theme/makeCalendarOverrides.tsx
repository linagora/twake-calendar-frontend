import { alpha, createTheme, Theme, makePalette } from '@linagora/twake-mui'
import type { ThemeOptions } from '@mui/material/styles'
import type {} from '@mui/x-date-pickers/themeAugmentation'
import { AccordionExpandIcon } from '@linagora/twake-mui'
import paletteData from './palette.json'
import { typography } from './typography'

export const radius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  pill: '100px'
}

function getDateCalendarRootOverrides(theme: Theme) {
  return {
    '.MuiDateCalendar-root.MuiDateCalendar-root': {
      width: '230px',
      maxWidth: '230px',
      height: '300px',
      maxHeight: '300px'
    },
    '.MuiDateCalendar-root .MuiDayCalendar-slideTransition': {
      minHeight: '208px'
    },
    '.MuiDateCalendar-root .MuiPickersCalendarHeader-root': {
      padding: '6px 4px',
      maxHeight: '32px',
      minHeight: '32px'
    },
    '.MuiDateCalendar-root .MuiPickersCalendarHeader-label': {
      fontSize: '14px',
      fontStyle: 'normal',
      fontWeight: 600,
      lineHeight: '20px',
      color: alpha(theme.palette.grey[900], 0.9)
    },
    '.MuiDateCalendar-root .MuiPickersCalendarHeader-switchViewButton': {
      padding: '0',
      width: '32px',
      height: '32px',
      color: theme.palette.grey[900]
    },
    '.MuiDateCalendar-root .MuiPickersCalendarHeader-switchViewIcon': {
      fontSize: '15px'
    },
    '.MuiDateCalendar-root .MuiPickersArrowSwitcher-button': {
      padding: '0',
      width: '32px',
      height: '32px',
      color: alpha(theme.palette.grey[900], 0.48)
    },
    '.MuiDateCalendar-root .MuiDayCalendar-weekDayLabel': {
      fontSize: '10px',
      fontStyle: 'normal',
      fontWeight: 500,
      lineHeight: '16px',
      height: '32px',
      width: '32px',
      margin: '0',
      color: alpha(theme.palette.grey[900], 0.48)
    },
    '.MuiDateCalendar-root .MuiPickerDay-root': {
      fontSize: '10px',
      fontStyle: 'normal',
      fontWeight: 500,
      lineHeight: '16px',
      height: '32px',
      width: '32px',
      margin: '0',
      color: alpha(theme.palette.grey[900], 0.9)
    },
    '.MuiDateCalendar-root .MuiPickerDay-root.MuiPickerDay-today': {
      border: 'none',
      outline: 'none'
    },
    '.MuiDateCalendar-root .MuiPickerDay-root.Mui-selected': {
      color: 'white',
      backgroundColor: theme.palette.primary.main,
      '&:hover': {
        backgroundColor: theme.palette.primary.dark
      }
    },
    '.MuiDateCalendar-root .MuiButtonBase-root.MuiPickerDay-root.Mui-selected':
      {
        color: 'white',
        backgroundColor: `${theme.palette.primary.main}`,
        '&:hover': {
          backgroundColor: `${theme.palette.primary.dark}`
        }
      }
  }
}

function getMonthCalendarOverrides(theme: Theme) {
  return {
    '.MuiDateCalendar-root .MuiMonthCalendar-root': {
      width: '215px'
    },
    '.MuiDateCalendar-root .MuiMonthCalendar-button': {
      fontSize: '14px',
      lineHeight: 1,
      height: '30px',
      width: '55px'
    },
    '.MuiDateCalendar-root .MuiMonthCalendar-button[tabindex="0"]': {
      background: 'transparent'
    },
    '.MuiDateCalendar-root .MuiMonthCalendar-button.Mui-selected': {
      color: theme.palette.primary.contrastText,
      background: theme.palette.primary.main,
      '&:hover': {
        background: theme.palette.primary.dark
      },
      '&:focus': {
        background: theme.palette.primary.dark
      }
    },
    '.MuiDateCalendar-root .MuiMonthCalendar-button.Mui-selected[tabindex="0"]':
      {
        color: theme.palette.primary.contrastText,
        background: theme.palette.primary.main,
        '&:hover': {
          background: theme.palette.primary.dark
        },
        '&:focus': {
          background: theme.palette.primary.dark
        }
      }
  }
}

function getYearCalendarOverrides(theme: Theme) {
  return {
    '.MuiDateCalendar-root .MuiYearCalendar-root': {
      width: '245px',
      maxWidth: '245px'
    },
    '.MuiDateCalendar-root .MuiYearCalendar-button': {
      fontSize: '14px',
      lineHeight: 1,
      height: '30px',
      width: '55px'
    },
    '.MuiDateCalendar-root .MuiYearCalendar-button[tabindex="0"]': {
      background: 'transparent'
    },
    '.MuiDateCalendar-root .MuiYearCalendar-button.Mui-selected': {
      color: theme.palette.primary.contrastText,
      background: theme.palette.primary.main,
      '&:hover': {
        background: theme.palette.primary.dark
      },
      '&:focus': {
        background: theme.palette.primary.dark
      }
    },
    '.MuiDateCalendar-root .MuiYearCalendar-button.Mui-selected[tabindex="0"]':
      {
        color: theme.palette.primary.contrastText,
        background: theme.palette.primary.main,
        '&:hover': {
          background: theme.palette.primary.dark
        },
        '&:focus': {
          background: theme.palette.primary.dark
        }
      },
    '.MuiButtonBase-root.MuiMenuItem-root.MuiDigitalClock-item.Mui-selected': {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      '&:hover': {
        backgroundColor: theme.palette.primary.dark
      }
    }
  }
}

const basicThemeOverrides = {
  MuiAccordion: {
    styleOverrides: {
      root: {
        '&::before': {
          display: 'none'
        }
      }
    }
  },
  MuiAccordionSummary: {
    defaultProps: { expandIcon: <AccordionExpandIcon /> },
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        ...theme.typography.caption,
        color: theme.palette.text.secondary,
        minHeight: theme.typography.pxToRem(18),
        padding: 0,
        '&.Mui-expanded': {
          minHeight: theme.typography.pxToRem(18)
        }
      }),
      expandIconWrapper: ({ theme }: { theme: Theme }) => ({
        '&&': {
          marginLeft: theme.typography.pxToRem(8)
        },
        transform: 'rotate(-180deg)',
        '& svg': {
          width: theme.typography.pxToRem(16),
          height: theme.typography.pxToRem(16)
        },
        '&.Mui-expanded': {
          marginLeft: theme.typography.pxToRem(8),
          transform: 'rotate(0deg)'
        }
      }),
      content: ({ theme }: { theme: Theme }) => ({
        margin: 0,
        padding: 0,
        ...theme.typography.caption,
        display: 'flex',
        alignItems: 'center',
        '&.Mui-expanded': {
          margin: 0
        }
      })
    }
  },
  MuiListItem: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        '.MuiAccordion-root &': {
          padding: '0',
          borderRadius: theme.typography.pxToRem(4),
          '&:hover': {
            backgroundColor: alpha(theme.palette.grey[900], 0.04)
          },
          '& label': {
            ...theme.typography.body2,
            color: alpha(theme.palette.grey[900], 0.9)
          }
        }
      })
    }
  }
}

/**
This function allows us to create themes overrides that are specific to Twake Calendar.
(eg. palette, specific components like date pickers from mui/x-date-pickers, etc)
**/
export function makeCalendarOverrides(): ThemeOptions {
  const palette = makePalette('light', paletteData)
  const theme = createTheme({
    palette,
    breakpoints: {
      keys: ['xs', 'sm', 'md', 'lg', 'xl'],
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1536
      }
    }
  })

  return {
    palette,
    typography,
    components: {
      ...basicThemeOverrides,
      MuiCssBaseline: {
        styleOverrides: {
          ...getDateCalendarRootOverrides(theme),
          ...getMonthCalendarOverrides(theme),
          ...getYearCalendarOverrides(theme)
        }
      }
    }
  }
}
