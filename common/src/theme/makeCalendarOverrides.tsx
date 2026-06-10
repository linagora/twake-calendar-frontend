import {
  alpha,
  makePalette,
  createTheme,
  ThemeOptions
} from '@linagora/twake-mui'
import paletteData from './palette.json'

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
    components: {
      MuiDateCalendar: {
        root: {
          width: '230px',
          maxWidth: '230px',
          height: '300px',
          maxHeight: '300px'
        }
      },
      MuiDayCalendar: {
        slideTransition: {
          minHeight: '208px'
        },
        weekDayLabel: {
          fontSize: '10px',
          fontStyle: 'normal',
          fontWeight: 500,
          lineHeight: '16px',
          height: '32px',
          width: '32px',
          margin: '0',
          color: alpha(theme.palette.grey[900], 0.48)
        }
      },
      MuiPickersCalendarHeader: {
        root: {
          padding: '6px 4px',
          maxHeight: '32px',
          minHeight: '32px'
        },
        label: {
          fontSize: '14px',
          fontStyle: 'normal',
          fontWeight: 600,
          lineHeight: '20px',
          color: alpha(theme.palette.grey[900], 0.9)
        },
        switchViewButton: {
          padding: '0',
          width: '32px',
          height: '32px',
          color: theme.palette.grey[900]
        },
        switchViewIcon: {
          fontSize: '15px'
        }
      },
      MuiPickersArrowSwitcher: {
        button: {
          padding: '0',
          width: '32px',
          height: '32px',
          color: alpha(theme.palette.grey[900], 0.48)
        }
      },
      MuiPickerDay: {
        root: {
          fontSize: '10px',
          fontStyle: 'normal',
          fontWeight: 500,
          lineHeight: '16px',
          height: '32px',
          width: '32px',
          margin: '0',
          color: alpha(theme.palette.grey[900], 0.9)
        },
        selected: {
          backgroundColor: theme.palette.primary.main,
          '&:hover': {
            backgroundColor: theme.palette.primary.dark
          }
        }
      },
      MuiMonthCalendar: {
        root: {
          width: '215px'
        }
      },
      MuiPickersMonth: {
        monthButton: {
          fontSize: '14px',
          lineHeight: 1,
          height: '30px',
          width: '55px',
          '&[tabindex="0"]': {
            background: 'transparent'
          },
          '&.Mui-selected': {
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
      },
      MuiYearCalendar: {
        root: {
          width: '245px',
          maxWidth: '245px'
        }
      },
      MuiPickersYear: {
        yearButton: {
          fontSize: '14px',
          lineHeight: 1,
          height: '30px',
          width: '55px',
          '&[tabindex="0"]': {
            background: 'transparent'
          },
          '&.Mui-selected': {
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
      },
      MuiDigitalClock: {
        item: {
          '&.Mui-selected': {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark
            }
          }
        }
      }
    }
  }
}
