// Upstream to twake-ui: no. The theme of @linagora/twake-mui 5.1.1, kept so
// that the upgrade to twake-mui 13 does not change the calendar. Delete an
// entry here to adopt the twake-mui 13 look of that component.
import { AccordionExpandIcon, radius } from '@linagora/twake-mui'
import { menuItemClasses } from '@mui/material/MenuItem'
import { ThemeOptions, alpha, darken } from '@mui/material/styles'
import React from 'react'

export const legacyOverrides: NonNullable<ThemeOptions['components']> = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: radius.pill,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none'
        },
        '&:active': {
          boxShadow: 'none'
        },
        '&:focus': {
          boxShadow: 'none'
        },
        variants: [
          {
            props: { variant: 'contained', color: 'secondary' },
            style: ({ theme }) => ({
              backgroundColor: theme.palette.secondary.main,
              color: alpha(theme.palette.text.primary, 0.9),
              borderRadius: radius.sm,
              '&:hover': {
                backgroundColor: theme.palette.secondary.dark,
                color: alpha(theme.palette.text.primary, 0.9)
              },
              '&.Mui-disabled': {
                backgroundColor: theme.palette.action.disabledBackground
              }
            })
          },
          {
            props: { size: 'small' },
            style: {
              padding: '6px 16px'
            }
          },
          {
            props: { size: 'medium' },
            style: {
              padding: '9px 24px'
            }
          },
          {
            props: { size: 'large' },
            style: {
              padding: '12px 32px'
            }
          },
          {
            props: { variant: 'contained', size: 'small' },
            style: {
              paddingTop: '7px',
              paddingBottom: '7px'
            }
          },
          {
            props: { variant: 'contained', size: 'medium' },
            style: {
              paddingTop: '10px',
              paddingBottom: '10px'
            }
          },
          {
            props: { variant: 'contained', size: 'large' },
            style: {
              paddingTop: '13px',
              paddingBottom: '13px'
            }
          }
        ]
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none'
        },
        '&:active': {
          boxShadow: 'none'
        },
        '&:focus': {
          boxShadow: 'none'
        }
      },
      outlined: ({ theme }) => ({
        backgroundColor: theme.palette.background.paper,
        borderColor: alpha(theme.palette.grey[900], 0.28),
        color: alpha(theme.palette.text.primary, 0.9),
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.04),
          color: theme.palette.primary.main,
          borderColor: alpha(theme.palette.primary.main, 0.32)
        },
        '&.Mui-disabled': {
          backgroundColor: theme.palette.background.paper,
          color: alpha(theme.palette.grey[900], 0.38),
          borderColor: alpha(theme.palette.grey[900], 0.28)
        }
      })
    }
  },
  MuiTextField: {
    defaultProps: {
      size: 'medium'
    },
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: radius.sm,
          '& fieldset': {
            borderRadius: radius.sm
          }
        }
      }
    }
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: radius.sm,
        '&.Mui-focused fieldset': {
          borderWidth: '1px'
        },
        '& input::placeholder': {
          color: theme.palette.secondary.dark,
          opacity: 1
        },
        '& .MuiSvgIcon-root': {
          fontSize: '18px'
        }
      }),
      input: {
        padding: '11px 16px', // Default medium: 48px height
        height: 'auto',
        lineHeight: '24px',
        variants: [
          {
            props: { size: 'small' },
            style: {
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '20px',
              minHeight: '26px'
            }
          }
        ]
      }
    },
    variants: [
      {
        props: { size: 'large' },
        style: {
          '& .MuiOutlinedInput-input': {
            padding: '14px 16px' // Large: 54px height
          }
        }
      }
    ]
  },
  MuiInputBase: {
    styleOverrides: {
      root: {
        '&.MuiInputBase-sizeLarge': {
          fontSize: '16px'
        }
      }
    }
  },
  MuiSelect: {
    styleOverrides: {
      root: {
        '&.MuiOutlinedInput-root': {
          '& .MuiSvgIcon-root': {
            fontSize: '25px'
          },
          '&.MuiInputBase-sizeSmall': {
            '& .MuiSelect-select': {
              padding: '10px 25px 10px 15px',
              fontSize: '14px',
              lineHeight: '20px',
              // Note: :has() selector removed due to jsdom compatibility in tests
              // If SVG is present, padding should be handled via component-level sx prop
              '& svg': {
                marginRight: '8px'
              }
            }
          }
        }
      }
    }
  },
  MuiAutocomplete: {
    styleOverrides: {
      root: {
        // Using "&&" to increase CSS specificity
        '&&': {
          '& .MuiOutlinedInput-root': {
            paddingLeft: '16px',
            borderRadius: radius.sm,
            '& fieldset.MuiOutlinedInput-notchedOutline': {
              borderRadius: radius.sm
            },
            '&.MuiInputBase-sizeSmall': {
              paddingTop: '8px',
              paddingBottom: '8px',
              paddingLeft: '16px',
              '& .MuiAutocomplete-input': {
                padding: '0px 4px 0px 8px'
              }
            }
          }
        }
      },
      // Styling for chips in Autocomplete
      tag: {
        margin: '2px'
      }
    }
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: radius.md,
        boxShadow:
          '0 1px 3px 0 rgba(0, 0, 0, 0.30), 0 4px 8px 3px rgba(0, 0, 0, 0.15)',
        maxWidth: '570px'
      },
      paperFullScreen: {
        borderRadius: 0,
        maxWidth: '100%'
      }
    }
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: ({ theme }) => ({
        ...theme.typography.h3,
        padding: '12px 32px',
        [theme.breakpoints.down('sm')]: {
          ...theme.typography.h4
        }
      })
    }
  },
  MuiDialogContent: {
    styleOverrides: {
      root: {
        padding: '24px 32px'
      }
    }
  },
  MuiDialogActions: {
    styleOverrides: {
      root: {
        padding: '16px 32px'
      }
    }
  },
  MuiPopover: {
    styleOverrides: {
      paper: {
        borderRadius: radius.md,
        boxShadow:
          '0 1px 3px 0 rgba(0, 0, 0, 0.30), 0 4px 8px 3px rgba(0, 0, 0, 0.15)'
      }
    }
  },
  MuiChip: {
    styleOverrides: {
      root: {
        '&.square': {
          borderRadius: radius.md
        }
      }
    }
  },
  MuiAvatar: {
    styleOverrides: {
      root: ({ theme }) => ({
        fontWeight: 600,
        '&.size-xs': {
          width: 18,
          height: 18,
          fontSize: '9.109px',
          fontWeight: 500,
          lineHeight: '18.219px',
          '& svg': {
            width: '50%',
            height: '50%'
          }
        },
        '&.size-s': {
          width: 28,
          height: 28,
          fontSize: '12.525px',
          fontWeight: 500,
          lineHeight: '18.219px',
          '& svg': {
            width: '50%',
            height: '50%'
          }
        },
        '&.size-m': {
          width: 36,
          height: 36,
          fontSize: '18.219px',
          fontWeight: 500,
          lineHeight: '27.328px',
          '& svg': {
            width: '50%',
            height: '50%'
          }
        },
        '&.size-l': {
          width: 54,
          height: 54,
          fontSize: '27.328px',
          fontWeight: 600,
          lineHeight: '36.438px',
          '& svg': {
            width: '50%',
            height: '50%'
          }
        },
        '&.size-xl': {
          width: 72,
          height: 72,
          fontSize: '36.438px',
          fontWeight: 600,
          lineHeight: '45.547px',
          '& svg': {
            width: '50%',
            height: '50%'
          }
        },
        '&.disabled': {
          color: theme.palette.primary.contrastText,
          background: theme.palette.grey[300],
          '& img': {
            filter: 'grayscale(1) brightness(2)',
            opacity: 0.5
          }
        },
        '&.displayInline': {
          display: 'inline-flex'
        },
        '&.border': {
          border: `2px solid ${theme.palette.background.paper}`
        },
        '&.innerBorder': {
          boxShadow: `inset 0px 0px 0px 1px ${theme.palette.divider}`
        },
        variants: [
          {
            props: { color: 'default' },
            style: {
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.secondary
            }
          }
        ]
      })
    }
  },
  MuiToggleButtonGroup: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderColor: theme.palette.secondary.dark,
        '& .MuiToggleButton-root:not(.Mui-selected)': {
          color: theme.palette.text.secondary,
          backgroundColor: alpha(theme.palette.text.secondary, 0.08),
          '& svg, & .MuiSvgIcon-root': {
            color: theme.palette.text.secondary
          }
        }
      })
    }
  },
  MuiToggleButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        color: theme.palette.text.primary,
        '&.Mui-selected': {
          color: theme.palette.text.primary,
          backgroundColor: 'transparent',
          '&:hover': {
            backgroundColor: 'transparent'
          },
          '& svg, & .MuiSvgIcon-root': {
            color: theme.palette.primary.main
          }
        },
        variants: [
          {
            props: { size: 'medium' },
            style: {
              padding: '9px 24px'
            }
          }
        ]
      })
    }
  },
  MuiIconButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        color: alpha(theme.palette.grey[900], 0.48),
        padding: '4px'
      })
    }
  },
  MuiCheckbox: {
    styleOverrides: {
      root: {
        '&.MuiCheckbox-sizeSmall': {
          padding: '6px'
        }
      }
    }
  },
  MuiBackdrop: {
    styleOverrides: {
      root: {
        variants: [
          {
            props: { invisible: false },
            style: ({ theme }) => ({
              backgroundColor: alpha(
                theme.palette.text.primary,
                theme.palette.action.focusOpacity
              )
            })
          }
        ]
      }
    }
  },
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
      root: ({ theme }) => ({
        backgroundColor: theme.palette.grey[100],
        textTransform: 'uppercase',
        fontWeight: 'bold',
        fontSize: '0.875rem',
        minHeight: '3.5rem',
        padding: 0,
        color: theme.palette.text.primary,
        '&.Mui-expanded': {
          minHeight: '3.5rem'
        }
      }),
      expandIconWrapper: {
        order: 0,
        '&&': {
          marginLeft: '0.3125rem'
        },
        transform: 'rotate(-90deg)',
        '&.Mui-expanded': {
          marginLeft: '0.3125rem',
          transform: 'rotate(0deg)'
        }
      },
      content: {
        margin: '0.75rem 0',
        paddingLeft: '0.5rem',
        paddingRight: '0.25rem',
        order: 1,
        '& > :last-child': {
          paddingRight: 0
        },
        '&.Mui-expanded': {
          margin: '0.75rem 0'
        }
      }
    }
  },
  MuiFab: {
    defaultProps: { size: 'medium' },
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 28,
        width: 96,
        height: 96,
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.background.paper,
        '&:hover': {
          backgroundColor: darken(theme.palette.background.paper, 0.05)
        },
        '@media (hover: none)': {
          backgroundColor: theme.palette.background.paper
        }
      }),
      primary: ({ theme }) => ({
        color: theme.palette.primary.dark,
        backgroundColor: theme.palette.primary.light,
        '&:hover': {
          backgroundColor: darken(theme.palette.primary.light, 0.05)
        },
        '@media (hover: none)': {
          backgroundColor: theme.palette.primary.light
        }
      }),
      extended: {
        borderRadius: 16,
        width: 'auto',
        height: 56,
        minWidth: 56,
        padding: '0 20px',
        '&.MuiFab-sizeSmall': {
          borderRadius: 16,
          width: 'auto',
          height: 42,
          minWidth: 42,
          padding: '0 12px'
        },
        '&.MuiFab-sizeMedium': {
          borderRadius: 16,
          width: 'auto',
          height: 48,
          minWidth: 48,
          padding: '0 16px'
        }
      },
      sizeSmall: {
        borderRadius: 12,
        width: 40,
        height: 40
      },
      sizeMedium: {
        borderRadius: 16,
        width: 56,
        height: 56
      }
    }
  },
  MuiTooltip: {
    defaultProps: { arrow: true },
    styleOverrides: {
      tooltip: ({ theme }) => ({
        backgroundColor: alpha(theme.palette.grey[800], 0.9),
        fontSize: '1rem',
        lineHeight: 1.3,
        borderRadius: '4px',
        padding: '8px 12px'
      })
    }
  },
  MuiCssBaseline: {
    styleOverrides: theme => ({
      '.MuiAccordion-root .MuiListItem-root': {
        padding: '0',
        borderRadius: '4px',
        '&:hover': {
          backgroundColor: alpha(theme.palette.grey[900], 0.04)
        }
      },
      '.MuiAccordion-root .MuiListItem-root label': {
        fontSize: '14px',
        fontStyle: 'normal',
        fontWeight: 400,
        color: alpha(theme.palette.grey[900], 0.9)
      }
    })
  },
  MuiMenuItem: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: radius.md,
        '&&&:hover': {
          backgroundColor: `${alpha(theme.palette.primary.main, theme.palette.action.hoverOpacity)}`
        },
        [`&.${menuItemClasses.selected}`]: {
          backgroundColor: alpha(
            theme.palette.primary.main,
            theme.palette.action.selectedOpacity
          ),
          '&:hover': {
            backgroundColor: alpha(
              theme.palette.primary.main,
              theme.palette.action.selectedOpacity +
                theme.palette.action.hoverOpacity
            )
          }
        }
      })
    }
  },
  MuiSwipeableDrawer: {
    defaultProps: {
      sx: theme => ({
        '& .MuiDrawer-paper': {
          borderTopLeftRadius: radius.md,
          borderTopRightRadius: radius.md,
          '&::before': {
            content: '""',
            display: 'block',
            width: '64px',
            height: '4px',
            backgroundColor: theme.palette.action.disabledBackground,
            borderRadius: radius.md,
            margin: '12px auto',
            marginTop: '30px',
            flexShrink: 0
          }
        }
      })
    }
  }
}
