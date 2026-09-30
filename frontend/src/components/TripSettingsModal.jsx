import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { useTranslation } from '../hooks/useTranslation'
import {
  CREATE_CITY_MUTATION,
  CREATE_STOP_CATEGORY_MUTATION,
  DELETE_CITY_MUTATION,
  DELETE_STOP_CATEGORY_MUTATION,
  RENAME_CITY_MUTATION,
  UPDATE_STOP_CATEGORY_MUTATION,
} from '../graphql/mutations'
import { TRIP_QUERY } from '../graphql/queries'
import { ConfirmDialog } from './ConfirmDialog'
import { Modal } from './Modal'
import { CheckIcon, PencilIcon, PlusIcon, SettingsIcon, TrashIcon, XIcon } from './Icons'

function CityRow({ city, tripId }) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(city.name)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const refetch = {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  }
  const [runRename, { loading: renaming, error: renameError }] = useMutation(
    RENAME_CITY_MUTATION,
    refetch,
  )
  const [runDelete, { loading: deleting }] = useMutation(DELETE_CITY_MUTATION, refetch)

  function startEditing() {
    setNameDraft(city.name)
    setIsEditing(true)
  }

  async function handleRename(event) {
    event.preventDefault()
    await runRename({ variables: { id: city.id, name: nameDraft } })
    setIsEditing(false)
  }

  async function handleConfirmDelete() {
    setDeleteError(null)
    try {
      await runDelete({ variables: { id: city.id } })
      setIsConfirmingDelete(false)
    } catch (err) {
      setDeleteError(err.message)
    }
  }

  if (isEditing) {
    return (
      <form
        onSubmit={handleRename}
        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
      >
        <input
          type="text"
          required
          autoFocus
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-2 py-1 text-ink focus:outline-2 focus:outline-accent"
        />
        {renameError ? <p className="text-sm text-red-600">{renameError.message}</p> : null}
        <button
          type="submit"
          disabled={renaming}
          aria-label={t('common.save')}
          className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <CheckIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <XIcon size={16} />
        </button>
      </form>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
      <span className="truncate text-sm text-ink">{city.name}</span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={startEditing}
          aria-label={t('citiesModal.renameAria', { name: city.name })}
          className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <PencilIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            setDeleteError(null)
            setIsConfirmingDelete(true)
          }}
          aria-label={t('citiesModal.deleteAria', { name: city.name })}
          className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <TrashIcon size={16} />
        </button>
      </div>

      {isConfirmingDelete ? (
        <ConfirmDialog
          title={t('citiesModal.deleteTitle')}
          message={t('citiesModal.deleteMessage', { name: city.name })}
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsConfirmingDelete(false)}
          loading={deleting}
          error={deleteError}
        />
      ) : null}
    </div>
  )
}

function CitiesTab({ tripId, cities }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [runCreate, { loading: creating, error: createError }] = useMutation(
    CREATE_CITY_MUTATION,
    {
      refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
      awaitRefetchQueries: true,
    },
  )

  async function handleCreate(event) {
    event.preventDefault()
    await runCreate({ variables: { tripId, name } })
    setName('')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {cities.length === 0 ? (
          <p className="text-sm text-muted">{t('citiesModal.empty')}</p>
        ) : (
          cities.map((city) => <CityRow key={city.id} city={city} tripId={tripId} />)
        )}
      </div>

      <form onSubmit={handleCreate} className="mt-4 flex shrink-0 items-center gap-2">
        <input
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('citiesModal.namePlaceholder')}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
        />
        <button
          type="submit"
          disabled={creating}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-ink disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <PlusIcon size={16} />
          {creating ? t('citiesModal.adding') : t('citiesModal.add')}
        </button>
      </form>
      {createError ? <p className="mt-2 shrink-0 text-sm text-red-600">{createError.message}</p> : null}
    </div>
  )
}

function CategoryRow({ category, tripId }) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(category.name)
  const [emojiDraft, setEmojiDraft] = useState(category.emoji)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const refetch = {
    refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
    awaitRefetchQueries: true,
  }
  const [runUpdate, { loading: updating, error: updateError }] = useMutation(
    UPDATE_STOP_CATEGORY_MUTATION,
    refetch,
  )
  const [runDelete, { loading: deleting }] = useMutation(DELETE_STOP_CATEGORY_MUTATION, refetch)

  function startEditing() {
    setNameDraft(category.name)
    setEmojiDraft(category.emoji)
    setIsEditing(true)
  }

  async function handleUpdate(event) {
    event.preventDefault()
    await runUpdate({ variables: { id: category.id, name: nameDraft, emoji: emojiDraft } })
    setIsEditing(false)
  }

  async function handleConfirmDelete() {
    setDeleteError(null)
    try {
      await runDelete({ variables: { id: category.id } })
      setIsConfirmingDelete(false)
    } catch (err) {
      setDeleteError(err.message)
    }
  }

  if (isEditing) {
    return (
      <form
        onSubmit={handleUpdate}
        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
      >
        <input
          type="text"
          required
          autoFocus
          value={emojiDraft}
          onChange={(event) => setEmojiDraft(event.target.value)}
          maxLength={4}
          aria-label={t('categoriesModal.emojiPlaceholder')}
          className="w-12 shrink-0 rounded-lg border border-border bg-surface-2 px-2 py-1 text-center text-ink focus:outline-2 focus:outline-accent"
        />
        <input
          type="text"
          required
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-2 py-1 text-ink focus:outline-2 focus:outline-accent"
        />
        {updateError ? <p className="text-sm text-red-600">{updateError.message}</p> : null}
        <button
          type="submit"
          disabled={updating}
          aria-label={t('common.save')}
          className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <CheckIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <XIcon size={16} />
        </button>
      </form>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
      <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
        <span aria-hidden="true">{category.emoji}</span>
        <span className="truncate">{category.name}</span>
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={startEditing}
          aria-label={t('categoriesModal.renameAria', { name: category.name })}
          className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <PencilIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            setDeleteError(null)
            setIsConfirmingDelete(true)
          }}
          aria-label={t('categoriesModal.deleteAria', { name: category.name })}
          className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <TrashIcon size={16} />
        </button>
      </div>

      {isConfirmingDelete ? (
        <ConfirmDialog
          title={t('categoriesModal.deleteTitle')}
          message={t('categoriesModal.deleteMessage', { name: category.name })}
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsConfirmingDelete(false)}
          loading={deleting}
          error={deleteError}
        />
      ) : null}
    </div>
  )
}

function CategoriesTab({ tripId, stopCategories }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [runCreate, { loading: creating, error: createError }] = useMutation(
    CREATE_STOP_CATEGORY_MUTATION,
    {
      refetchQueries: [{ query: TRIP_QUERY, variables: { id: tripId } }],
      awaitRefetchQueries: true,
    },
  )

  async function handleCreate(event) {
    event.preventDefault()
    await runCreate({ variables: { tripId, name, emoji } })
    setName('')
    setEmoji('')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {stopCategories.length === 0 ? (
          <p className="text-sm text-muted">{t('categoriesModal.empty')}</p>
        ) : (
          stopCategories.map((category) => (
            <CategoryRow key={category.id} category={category} tripId={tripId} />
          ))
        )}
      </div>

      <form onSubmit={handleCreate} className="mt-4 flex shrink-0 items-center gap-2">
        <input
          type="text"
          required
          value={emoji}
          onChange={(event) => setEmoji(event.target.value)}
          placeholder={t('categoriesModal.emojiPlaceholder')}
          maxLength={4}
          className="w-16 shrink-0 rounded-lg border border-border bg-surface-2 px-2 py-2 text-center text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
        />
        <input
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('categoriesModal.namePlaceholder')}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
        />
        <button
          type="submit"
          disabled={creating}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-ink disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <PlusIcon size={16} />
          {creating ? t('categoriesModal.adding') : t('categoriesModal.add')}
        </button>
      </form>
      {createError ? <p className="mt-2 shrink-0 text-sm text-red-600">{createError.message}</p> : null}
    </div>
  )
}

export function TripSettingsModal({ tripId, cities, stopCategories, onClose }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('cities')

  return (
    <Modal onClose={onClose} className="flex h-[32rem] max-w-md flex-col" closeOnOverlayClick={false}>
      <button
        type="button"
        onClick={onClose}
        aria-label={t('common.close')}
        className="absolute right-2 top-2 cursor-pointer rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        <XIcon size={18} />
      </button>

      <h2 className="font-display mb-4 flex shrink-0 items-center gap-2 pr-6 text-lg text-ink">
        <SettingsIcon size={20} className="text-accent" />
        {t('settingsModal.title')}
      </h2>

      <div className="mb-4 flex w-fit shrink-0 gap-1 rounded-lg border border-border bg-surface-2 p-1">
        {[
          { id: 'cities', label: t('settingsModal.tabCities') },
          { id: 'categories', label: t('settingsModal.tabCategories') },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              activeTab === tab.id ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === 'cities' ? (
          <CitiesTab tripId={tripId} cities={cities} />
        ) : (
          <CategoriesTab tripId={tripId} stopCategories={stopCategories} />
        )}
      </div>
    </Modal>
  )
}
