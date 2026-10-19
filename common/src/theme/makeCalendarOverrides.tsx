import { Theme } from '@linagora/twake-mui'
import type {
  PaletteColor,
  PaletteColorOptions,
  ThemeOptions
} from '@mui/material/styles'
import type {} from '@mui/x-date-pickers/themeAugmentation'
import { AccordionExpandIcon } from '@linagora/twake-mui'
import { typography } from './typography'

declare module '@mui/material/styles' {
  interface Palette {
    today: PaletteColor
  }
  interface PaletteOptions {
    today?: PaletteColorOptions
  }
}

// The circle of today, lighter than the primary colour, in both schemes
const today = { main: '#FB9E3A', contrastText: '#fff' }

// Palette additions of the calendar, also given to the TwakeSpace embed
export const calendarColorSchemes: ThemeOptions['colorSchemes'] = {
  light: { palette: { today } },
  dark: { palette: { today } }
}

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
      color: theme.vars.palette.text.primary
    },
    '.MuiDateCalendar-root .MuiPickersCalendarHeader-switchViewButton': {
      padding: '0',
      width: '32px',
      height: '32px',
      color: `rgb(${theme.vars.palette.text.primaryChannel})`
    },
    '.MuiDateCalendar-root .MuiPickersCalendarHeader-switchViewIcon': {
      fontSize: '15px'
    },
    '.MuiDateCalendar-root .MuiPickersArrowSwitcher-button': {
      padding: '0',
      width: '32px',
      height: '32px',
      color: theme.alpha(theme.vars.palette.text.primary, 0.48)
    },
    '.MuiDateCalendar-root .MuiDayCalendar-weekDayLabel': {
      fontSize: '10px',
      fontStyle: 'normal',
      fontWeight: 500,
      lineHeight: '16px',
      height: '32px',
      width: '32px',
      margin: '0',
      color: theme.alpha(theme.vars.palette.text.primary, 0.48)
    },
    '.MuiDateCalendar-root .MuiPickerDay-root': {
      fontSize: '10px',
      fontStyle: 'normal',
      fontWeight: 500,
      lineHeight: '16px',
      height: '32px',
      width: '32px',
      margin: '0',
      color: theme.vars.palette.text.primary
    },
    // The colour above outranks MUI's own disabled colour: restore it so
    // days outside minDate/maxDate do not look selectable.
    '.MuiDateCalendar-root .MuiPickerDay-root.Mui-disabled:not(.Mui-selected)':
      {
        color: theme.vars.palette.text.disabled
      },
    '.MuiDateCalendar-root .MuiPickerDay-root.MuiPickerDay-today': {
      border: 'none',
      outline: 'none'
    },
    '.MuiDateCalendar-root .MuiPickerDay-root.Mui-selected': {
      color: theme.vars.palette.primary.contrastText,
      backgroundColor: theme.vars.palette.primary.main,
      '&:hover': {
        backgroundColor: theme.vars.palette.primary.dark
      }
    },
    '.MuiDateCalendar-root .MuiButtonBase-root.MuiPickerDay-root.Mui-selected':
      {
        color: theme.vars.palette.primary.contrastText,
        backgroundColor: `${theme.vars.palette.primary.main}`,
        '&:hover': {
          backgroundColor: `${theme.vars.palette.primary.dark}`
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
      color: theme.vars.palette.primary.contrastText,
      background: theme.vars.palette.primary.main,
      '&:hover': {
        background: theme.vars.palette.primary.dark
      },
      '&:focus': {
        background: theme.vars.palette.primary.dark
      }
    },
    '.MuiDateCalendar-root .MuiMonthCalendar-button.Mui-selected[tabindex="0"]':
      {
        color: theme.vars.palette.primary.contrastText,
        background: theme.vars.palette.primary.main,
        '&:hover': {
          background: theme.vars.palette.primary.dark
        },
        '&:focus': {
          background: theme.vars.palette.primary.dark
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
      color: theme.vars.palette.primary.contrastText,
      background: theme.vars.palette.primary.main,
      '&:hover': {
        background: theme.vars.palette.primary.dark
      },
      '&:focus': {
        background: theme.vars.palette.primary.dark
      }
    },
    '.MuiDateCalendar-root .MuiYearCalendar-button.Mui-selected[tabindex="0"]':
      {
        color: theme.vars.palette.primary.contrastText,
        background: theme.vars.palette.primary.main,
        '&:hover': {
          background: theme.vars.palette.primary.dark
        },
        '&:focus': {
          background: theme.vars.palette.primary.dark
        }
      },
    '.MuiButtonBase-root.MuiMenuItem-root.MuiDigitalClock-item.Mui-selected': {
      backgroundColor: theme.vars.palette.primary.main,
      color: theme.vars.palette.primary.contrastText,
      '&:hover': {
        backgroundColor: theme.vars.palette.primary.dark
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
        color: theme.vars.palette.text.secondary,
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
  // twake-mui draws the "+N" avatar like the page, outlined by a ring on the
  // last child, which is the wrapper of an attendee here: keep MUI's grey disc
  MuiAvatarGroup: {
    defaultProps: {
      slotProps: {
        surplus: { sx: { bgcolor: 'grey.400', color: 'background.default' } }
      }
    },
    styleOverrides: { root: {} }
  },
  // twake-mui sets the caret 14px from the edge, which only outlined selects
  // make room for: put it back against the edge of borderless ones
  MuiSelect: {
    styleOverrides: { standard: { '& ~ .MuiSelect-icon': { right: 0 } } }
  },
  // twake-mui fills unchecked radios with the border colour, too pale to
  // see: use the colour of unchecked checkboxes. Its root override is a
  // function, which a root of ours would replace, hence the colour slot.
  MuiRadio: {
    styleOverrides: {
      colorPrimary: ({ theme }: { theme: Theme }) => ({
        '&:not(.Mui-checked):not(.Mui-disabled) svg': {
          fill: theme.vars.palette.text.secondary
        }
      })
    }
  },
  // Lighter than MUI's black backdrop, as with the twake-mui 5 theme
  MuiBackdrop: {
    styleOverrides: {
      root: {
        variants: [
          {
            props: { invisible: false },
            style: ({ theme }: { theme: Theme }) => ({
              backgroundColor: theme.alpha(
                theme.vars.palette.text.primary,
                theme.vars.palette.action.focusOpacity
              )
            })
          }
        ]
      }
    }
  },
  // twake-mui draws a border between the summary and the details
  MuiAccordionDetails: {
    styleOverrides: {
      root: { padding: 0 }
    }
  },
  MuiListItem: {
    styleOverrides: {
      root: ({ theme }: { theme: Theme }) => ({
        '.MuiAccordion-root &': {
          padding: '0',
          borderRadius: theme.typography.pxToRem(4),
          '&:hover': {
            backgroundColor: theme.vars.palette.action.hover
          },
          '& label': {
            ...theme.typography.body2,
            color: theme.vars.palette.text.primary
          }
        }
      })
    }
  }
}

/**
This function allows us to create themes overrides that are specific to Twake Calendar.
(eg. specific components like date pickers from mui/x-date-pickers, etc)
**/
export function makeCalendarOverrides(
  includeDateOverrides?: boolean
): ThemeOptions {
  return {
    typography,
    colorSchemes: calendarColorSchemes,
    components: {
      ...basicThemeOverrides,
      MuiCssBaseline: {
        // A function of the theme, so the colours follow its colour scheme
        styleOverrides: includeDateOverrides
          ? (theme: Theme) => ({
              ...getDateCalendarRootOverrides(theme),
              ...getMonthCalendarOverrides(theme),
              ...getYearCalendarOverrides(theme)
            })
          : {}
      }
    }
  }
}
