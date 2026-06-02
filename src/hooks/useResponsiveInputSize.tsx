import { useScreenSizeDetection } from '@/useScreenSizeDetection'

export const useResponsiveInputSize = (): 'small' | 'medium' => {
  const { isTooSmall: isMobile } = useScreenSizeDetection()
  return isMobile ? 'medium' : 'small'
}
