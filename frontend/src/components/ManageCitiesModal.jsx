import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { useTranslation } from '../hooks/useTranslation'
import {
  CREATE_CITY_MUTATION,
  DELETE_CITY_MUTATION,
  RENAME_CITY_MUTATION,
} from '../graphql/mutations'
import { TRIP_QUERY } from '../graphql/queries'
import { ConfirmDialog } from './ConfirmDialog'
import { Modal } from './Modal'
import { BuildingIcon, CheckIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from './Icons'

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

export function ManageCitiesModal({ tripId, cities, onClose }) {
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
    <Modal onClose={onClose} className="max-w-md" closeOnOverlayClick={false}>
      <button
        type="button"
        onClick={onClose}
        aria-label={t('common.close')}
        className="absolute right-2 top-2 cursor-pointer rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        <XIcon size={18} />
      </button>

      <h2 className="font-display mb-4 flex items-center gap-2 pr-6 text-lg text-ink">
        <BuildingIcon size={20} className="text-accent" />
        {t('citiesModal.title')}
      </h2>

      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
        {cities.length === 0 ? (
          <p className="text-sm text-muted">{t('citiesModal.empty')}</p>
        ) : (
          cities.map((city) => <CityRow key={city.id} city={city} tripId={tripId} />)
        )}
      </div>

      <form onSubmit={handleCreate} className="mt-4 flex items-center gap-2">
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
      {createError ? <p className="mt-2 text-sm text-red-600">{createError.message}</p> : null}
    </Modal>
  )
}
