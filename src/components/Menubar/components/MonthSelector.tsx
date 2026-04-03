import { Box, Button, radius } from '@linagora/twake-mui'
import React, { useEffect, useRef } from 'react'
import { useI18n } from 'twake-i18n'

export type MonthSelectorProps = {
  currentDate: Date
  onMonthChange: (monthIndex: number) => void
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  currentDate,
  onMonthChange
}) => {
  const { t } = useI18n()
  const monthScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = monthScrollRef.current
    if (!container) return
    const selectedIndex = currentDate.getMonth()
    const button = container.children[selectedIndex] as HTMLElement | undefined
    if (button) {
      button.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      })
    }
  }, [currentDate])

  return (
    <Box
      ref={monthScrollRef}
      sx={{
        display: 'flex',
        overflowX: 'auto',
        gap: 2,
        px: 2,
        py: 1,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        backgroundColor: '#FFF'
      }}
    >
      {Array.from({ length: 12 }).map((_, i) => {
        const isSelected = currentDate.getMonth() === i
        return (
          <Button
            key={i}
            size="large"
            variant={isSelected ? 'contained' : 'outlined'}
            sx={{
              borderRadius: radius.md
            }}
            onClick={() => onMonthChange(i)}
          >
            {t(`months.short.${i}`)}
          </Button>
        )
      })}
    </Box>
  )
}
