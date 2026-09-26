import { useEffect, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation'
import { ArrowUpIcon } from './Icons'

const SHOW_AFTER_PX = 300

export function ScrollToTopButton() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > SHOW_AFTER_PX)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={t('common.scrollToTopAria')}
      className="fixed bottom-6 right-4 z-1000 cursor-pointer rounded-full border border-border bg-surface p-3 text-ink shadow-lg hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:bottom-8 sm:right-8"
    >
      <ArrowUpIcon size={20} />
    </button>
  )
}
