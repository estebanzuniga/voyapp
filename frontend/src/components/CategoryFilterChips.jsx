import { useTranslation } from '../hooks/useTranslation'
import { UNCATEGORIZED_EMOJI, UNCATEGORIZED_KEY } from '../lib/stopCategories'

// Single-select: at most one category is active at a time. No chip active
// means no filter is applied (every stop shows) - clicking the already-active
// chip again clears it back to that "show all" state, rather than needing a
// separate "All" chip. Shared between CityStopsPanel's list and CityMapModal
// so the same filter state can be adjusted from whichever view is open.
export function CategoryFilterChips({ stopCategories, selectedCategoryKey, onSelect }) {
  const { t } = useTranslation()

  const chips = [
    ...stopCategories.map((category) => ({
      key: category.id,
      label: `${category.emoji} ${category.name}`,
    })),
    { key: UNCATEGORIZED_KEY, label: `${UNCATEGORIZED_EMOJI} ${t('cityStops.uncategorized')}` },
  ]

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => {
        const isActive = chip.key === selectedCategoryKey
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onSelect(isActive ? null : chip.key)}
            aria-pressed={isActive}
            className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              isActive
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-border text-muted hover:border-accent'
            }`}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}
