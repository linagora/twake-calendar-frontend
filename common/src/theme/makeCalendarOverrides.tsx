import { alpha, createTheme, makePalette } from '@linagora/twake-mui'
import type { ThemeOptions } from '@mui/material/styles'
import type {} from '@mui/x-date-pickers/themeAugmentation'
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
      MuiCssBaseline: {
        styleOverrides: {
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
          '&.MuiDateCalendar-root .MuiPickerDay-root.MuiPickersDay-today': {
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
            },
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
            },
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
          '.MuiButtonBase-root.MuiMenuItem-root.MuiDigitalClock-item.Mui-selected':
            {
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
