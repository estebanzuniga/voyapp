import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from '../hooks/useTranslation'
import { AVATAR_COLOR_OPTIONS_QUERY, LANGUAGE_OPTIONS_QUERY } from '../graphql/queries'
import {
  UPDATE_AVATAR_COLOR_MUTATION,
  UPDATE_LANGUAGE_MUTATION,
  UPDATE_NAME_MUTATION,
} from '../graphql/mutations'
import { getInitials } from '../lib/avatar'
import { ChangePasswordModal } from '../components/ChangePasswordModal'
import { ArrowLeftIcon, CheckIcon, KeyIcon, LogOutIcon, PencilIcon, XIcon } from '../components/Icons'

// Language names are shown in themselves, not translated - a Spanish
// speaker still needs to recognize "English" to switch back, same reason
// language pickers everywhere (browsers, phone settings) do this.
const LANGUAGE_LABELS = { en: 'English', es: 'Español' }

export function ProfilePage() {
  const { user, logout, updateUser } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data } = useQuery(AVATAR_COLOR_OPTIONS_QUERY)
  const { data: languageData } = useQuery(LANGUAGE_OPTIONS_QUERY)
  const [runUpdateAvatarColor, { loading: savingColor, error: colorError }] = useMutation(
    UPDATE_AVATAR_COLOR_MUTATION,
  )
  const [runUpdateLanguage, { loading: savingLanguage, error: languageError }] = useMutation(
    UPDATE_LANGUAGE_MUTATION,
  )
  const [isEditingName, setIsEditingName] = useState(false)
  const [firstNameDraft, setFirstNameDraft] = useState('')
  const [lastNameDraft, setLastNameDraft] = useState('')
  const [runUpdateName, { loading: savingName, error: nameError }] = useMutation(
    UPDATE_NAME_MUTATION,
  )
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  async function handlePickColor(color) {
    if (color === user?.avatarColor) return
    const { data: result } = await runUpdateAvatarColor({ variables: { avatarColor: color } })
    updateUser({ avatarColor: result.updateAvatarColor.avatarColor })
  }

  async function handlePickLanguage(language) {
    if (language === user?.language) return
    const { data: result } = await runUpdateLanguage({ variables: { language } })
    updateUser({ language: result.updateLanguage.language })
  }

  function startEditingName() {
    setFirstNameDraft(user?.firstName ?? '')
    setLastNameDraft(user?.lastName ?? '')
    setIsEditingName(true)
  }

  async function handleSaveName(event) {
    event.preventDefault()
    const { data: result } = await runUpdateName({
      variables: { firstName: firstNameDraft, lastName: lastNameDraft },
    })
    updateUser({
      firstName: result.updateName.firstName,
      lastName: result.updateName.lastName,
    })
    setIsEditingName(false)
  }

  return (
    <div className="min-h-dvh bg-bg px-4 pb-8 pt-4 sm:px-8 sm:pt-6 lg:px-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/trips')}
            aria-label={t('profile.backAria')}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg p-2 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ArrowLeftIcon size={20} />
          </button>
          <h1 className="font-display text-2xl text-ink">{t('profile.heading')}</h1>
        </header>

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-lg text-white"
              style={{ backgroundColor: user?.avatarColor ?? 'var(--color-accent)' }}
            >
              {getInitials(user)}
            </div>

            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={firstNameDraft}
                    onChange={(event) => setFirstNameDraft(event.target.value)}
                    placeholder={t('auth.firstName.label')}
                    className="w-1/2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
                  />
                  <input
                    type="text"
                    required
                    value={lastNameDraft}
                    onChange={(event) => setLastNameDraft(event.target.value)}
                    placeholder={t('auth.lastName.label')}
                    className="w-1/2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-ink placeholder:text-muted/75 focus:outline-2 focus:outline-accent"
                  />
                </div>
                {nameError ? <p className="text-sm text-red-600">{nameError.message}</p> : null}
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingName}
                    className="cursor-pointer rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {savingName ? t('common.saving') : t('common.save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="flex cursor-pointer items-center gap-1 rounded-lg text-sm font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <XIcon size={14} />
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {user ? `${user.firstName} ${user.lastName}` : t('common.loading')}
                  </p>
                  <p className="truncate text-sm text-muted">{user?.email}</p>
                </div>
                {user ? (
                  <button
                    type="button"
                    onClick={startEditingName}
                    aria-label={t('profile.editNameAria')}
                    className="cursor-pointer rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <PencilIcon size={16} />
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold text-ink">{t('profile.avatarColor.title')}</h2>
          {colorError ? <p className="text-sm text-red-600">{colorError.message}</p> : null}
          <div className="flex flex-wrap gap-3">
            {(data?.avatarColorOptions ?? []).map((color) => {
              const isSelected = color === user?.avatarColor
              return (
                <button
                  key={color}
                  type="button"
                  disabled={savingColor}
                  onClick={() => handlePickColor(color)}
                  aria-label={t('profile.avatarColor.useAria', { color })}
                  aria-pressed={isSelected}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  style={{ backgroundColor: color }}
                >
                  {isSelected ? <CheckIcon size={18} className="text-white" /> : null}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold text-ink">{t('profile.language.title')}</h2>
          {languageError ? <p className="text-sm text-red-600">{languageError.message}</p> : null}
          <div className="flex flex-wrap gap-2">
            {(languageData?.languageOptions ?? []).map((language) => {
              const isSelected = language === (user?.language ?? 'en')
              return (
                <button
                  key={language}
                  type="button"
                  disabled={savingLanguage}
                  onClick={() => handlePickLanguage(language)}
                  aria-pressed={isSelected}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    isSelected
                      ? 'border-accent bg-accent text-accent-ink'
                      : 'border-border text-ink hover:border-accent'
                  }`}
                >
                  {isSelected ? <CheckIcon size={14} /> : null}
                  {LANGUAGE_LABELS[language] ?? language}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <button
            type="button"
            onClick={() => setIsChangingPassword(true)}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2.5 font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto sm:justify-start sm:border-none sm:px-0 sm:py-0"
          >
            <KeyIcon size={16} />
            {t('changePassword.title')}
          </button>
        </div>

        {isChangingPassword ? (
          <ChangePasswordModal onClose={() => setIsChangingPassword(false)} />
        ) : null}

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2.5 font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto sm:justify-start sm:border-none sm:px-0 sm:py-0"
          >
            <LogOutIcon size={16} />
            {t('profile.logout')}
          </button>
        </div>
      </div>
    </div>
  )
}
