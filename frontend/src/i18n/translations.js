// Flat key -> string dictionaries, one per supported language. Keys are
// namespaced by screen/component ("auth.login.heading") purely as a naming
// convention - `t()` just does a single object lookup, no nested traversal.
//
// `{placeholder}` tokens inside a string are filled in by `t(key, params)`
// via a simple find/replace (see `useTranslation.jsx`) - enough for this
// app's needs (a name, a count, a date) without pulling in a full ICU
// message-format library like react-i18next would.
export const LOCALE_BY_LANGUAGE = {
  en: 'en-US',
  es: 'es-ES',
}

export const translations = {
  en: {
    // --- common ------------------------------------------------------
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.loading': 'Loading…',
    'common.loadingMap': 'Loading map…',
    'common.save': 'Save',
    'common.saving': 'Saving…',
    'common.delete': 'Delete',
    'common.deleting': 'Deleting…',
    'common.adding': 'Adding…',
    'common.tagline': 'Every itinerary starts with a spark of somewhere else.',
    'common.passwordMismatch': "New password and confirmation don't match",

    // --- auth ----------------------------------------------------------
    'auth.login.heading': 'Welcome back',
    'auth.login.subtext': 'Log in to keep planning your next trip.',
    'auth.login.cta': 'Log in',
    'auth.login.switchPrompt': 'New to Voyapp?',
    'auth.login.switchLabel': 'Create an account',
    'auth.signup.heading': 'Start your story',
    'auth.signup.subtext': 'Create an account to begin your next itinerary.',
    'auth.signup.cta': 'Create account',
    'auth.signup.switchPrompt': 'Already have an account?',
    'auth.signup.switchLabel': 'Log in instead',
    'auth.firstName.label': 'First name',
    'auth.firstName.placeholder': 'Ada',
    'auth.lastName.label': 'Last name',
    'auth.lastName.placeholder': 'Lovelace',
    'auth.email.label': 'Email',
    'auth.email.placeholder': 'you@example.com',
    'auth.password.label': 'Password',
    'auth.newPassword.label': 'New password',
    'auth.forgotPassword': 'Forgot password?',
    'auth.submitting': 'Please wait…',

    // --- forgot / reset password ---------------------------------------
    'forgotPassword.checkInbox': 'Check your inbox',
    'forgotPassword.body':
      "If that email is registered, we've sent a link to reset your password. It's valid for 1 hour.",
    'forgotPassword.backToLogin': 'Back to log in',
    'forgotPassword.heading': 'Reset your password',
    'forgotPassword.subtext': "Enter your email and we'll send you a link to get back into your account.",
    'forgotPassword.sending': 'Sending…',
    'forgotPassword.sendLink': 'Send reset link',
    'forgotPassword.remembered': 'Remembered it after all?',
    'forgotPassword.logIn': 'Log in',

    'resetPassword.invalidLink': 'Invalid link',
    'resetPassword.invalidLinkBody': 'This reset link is missing its token. Request a new one to continue.',
    'resetPassword.requestNewLink': 'Request a new link',
    'resetPassword.heading': 'Choose a new password',
    'resetPassword.subtext': 'Enter and confirm your new password below.',
    'resetPassword.confirmPassword.label': 'Confirm password',
    'resetPassword.saveNewPassword': 'Save new password',

    // --- change password -------------------------------------------------
    'changePassword.title': 'Change password',
    'changePassword.updated': 'Password updated.',
    'changePassword.currentPassword.label': 'Current password',
    'changePassword.confirmPassword.label': 'Confirm new password',

    // --- password input ---------------------------------------------------
    'passwordInput.show': 'Show password',
    'passwordInput.hide': 'Hide password',

    // --- dashboard ----------------------------------------------------
    'dashboard.profileAria': 'Profile',
    'dashboard.yourTrips': 'Your trips',
    'dashboard.newTrip': 'New trip',
    'dashboard.noTripsYet': 'No trips yet — create your first one above.',

    // --- new trip form --------------------------------------------------
    'newTrip.title.label': 'Trip title',
    'newTrip.title.placeholder': 'Eurotrip {year}',
    'newTrip.startDate.label': 'Start date',
    'newTrip.endDate.label': 'End date',
    'newTrip.creating': 'Creating…',
    'newTrip.create': 'Create trip',

    // --- trip card --------------------------------------------------------
    'tripCard.sharedWithYou': 'Shared with you',

    // --- invite accept ------------------------------------------------
    'inviteAccept.invalidOrExpired':
      'This invite link is invalid or has expired. Ask whoever shared the trip for a fresh one.',
    'inviteAccept.invitedTo': 'You’ve been invited to "{title}"',
    'inviteAccept.body': "You'll be able to {permission} this trip.",
    'inviteAccept.permissionEditor': 'view and edit',
    'inviteAccept.permissionViewer': 'view',
    'inviteAccept.joining': 'Joining…',
    'inviteAccept.acceptInvite': 'Accept invite',
    'inviteAccept.logInPrompt': 'Log in or create a VoyApp account to accept it.',
    'inviteAccept.logInToAccept': 'Log in to accept',
    'inviteAccept.createAccount': 'Create an account',

    // --- profile ----------------------------------------------------------
    'profile.backAria': 'Back to your trips',
    'profile.heading': 'Profile',
    'profile.editNameAria': 'Edit name',
    'profile.avatarColor.title': 'Avatar color',
    'profile.avatarColor.useAria': 'Use {color} as avatar color',
    'profile.language.title': 'Language',
    'profile.logout': 'Log out',

    // --- trip detail --------------------------------------------------
    'tripDetail.backToTrips': 'Back to trips',
    'tripDetail.tripNotFound': 'Trip not found.',
    'tripDetail.sharedWith': 'Shared with you — {permission}',
    'tripDetail.canEdit': 'can edit',
    'tripDetail.viewOnly': 'view only',
    'tripDetail.share': 'Share',
    'tripDetail.noDaysYet': 'No days added yet.',
    'tripDetail.addDay': 'Add {date}',
    'tripDetail.daysPending': '{count} days pending',

    // --- day card -----------------------------------------------------
    'dayCard.viewDayMap': 'View day map',
    'dayCard.deleteDay': 'Delete day',
    'dayCard.reorderAria': 'Reorder stop',
    'dayCard.editAria': 'Edit {name}',
    'dayCard.duplicateAria': 'Duplicate {name}',
    'dayCard.removeAria': 'Remove {name}',
    'dayCard.viewNotes': 'View notes',
    'dayCard.hideNotes': 'Hide notes',
    'dayCard.optionalLabel': '(optional)',
    'dayCard.duplicateStopTitle': 'Duplicate stop',
    'dayCard.duplicateStopMessage': 'Add a copy of "{name}" right after it?',
    'dayCard.duplicate': 'Duplicate',
    'dayCard.duplicating': 'Duplicating…',
    'dayCard.removeStopTitle': 'Remove stop',
    'dayCard.removeStopMessage': 'Are you sure you want to remove "{name}"? This can\'t be undone.',
    'dayCard.deleteDayTitle': 'Delete day',
    'dayCard.deleteDayMessage':
      "Are you sure you want to delete {date}? All of its stops will be removed too. This can't be undone.",
    'dayCard.dragHere': 'Drag a stop here',
    'dayCard.noStopsYet': 'No stops yet',

    // --- stop forms (add/edit) -----------------------------------------
    'stopForm.name.label': 'Stop name',
    'stopForm.location.label': 'Location',
    'stopForm.startTime.label': 'Start time (optional)',
    'stopForm.notes.label': 'Notes (optional)',
    'stopForm.thisFieldIs': 'This field is:',
    'stopForm.important': 'Important',
    'stopForm.optional': 'Optional',
    'stopForm.addStop': 'Add stop',
    'stopForm.editStop': 'Edit stop',
    'stopForm.saveChanges': 'Save changes',

    // --- day map modal --------------------------------------------------
    'dayMap.exitFullScreen': 'Exit full screen',
    'dayMap.viewFullScreen': 'View full screen',

    // --- share modal --------------------------------------------------
    'shareModal.title': 'Share {title}',
    'shareModal.viewOnlyLinks': 'View-only links',
    'shareModal.editorLinks': 'Editor links',
    'shareModal.copyLinkAria': 'Copy link',
    'shareModal.showQrAria': 'Show QR code',
    'shareModal.copyNow': 'Copy it now — disappears in {seconds}s',
    'shareModal.revoke': 'Revoke',
    'shareModal.revokeLinkTitle': 'Revoke link',
    'shareModal.revokeLinkMessage':
      'Anyone who opens this specific link from now on will be turned away. Other links, and people who already joined, are unaffected.',
    'shareModal.generating': 'Generating…',
    'shareModal.waitSeconds': 'Wait {seconds}s',
    'shareModal.newLink': 'New link',
    'shareModal.linkAlreadyShown':
      'A link was generated but already shown once - generate a new one to share it again.',
    'shareModal.noLinksYet': 'No {kind} links yet.',
    'shareModal.editorWord': 'editor',
    'shareModal.viewOnlyWord': 'view-only',
    'shareModal.canView': 'Can view',
    'shareModal.canEdit': 'Can edit',
    'shareModal.removeAria': 'Remove {email}',
    'shareModal.removeAccessTitle': 'Remove access',
    'shareModal.removeAccessMessage': '{email} will no longer be able to view or edit this trip.',
    'shareModal.remove': 'Remove',
    'shareModal.peopleWithAccess': 'People with access ({count}/{max})',
    'shareModal.noOneAccepted': 'No one has accepted an invite yet.',

    // --- QR code -------------------------------------------------------
    'qrCode.error': "Couldn't generate the QR code.",
    'qrCode.alt': 'Scan to open this share link',

    // --- map picker ------------------------------------------------------
    'mapPicker.searchPlaceholder': 'Search for a place…',
    'mapPicker.searching': 'Searching…',
    'mapPicker.selected': 'Selected: {lat}, {lng}',
    'mapPicker.prompt': 'Search or tap the map to choose a location.',
  },

  es: {
    // --- common ------------------------------------------------------
    'common.cancel': 'Cancelar',
    'common.close': 'Cerrar',
    'common.loading': 'Cargando…',
    'common.loadingMap': 'Cargando mapa…',
    'common.save': 'Guardar',
    'common.saving': 'Guardando…',
    'common.delete': 'Eliminar',
    'common.deleting': 'Eliminando…',
    'common.adding': 'Agregando…',
    'common.tagline': 'Cada itinerario comienza con la chispa de otro lugar.',
    'common.passwordMismatch': 'La nueva contraseña y la confirmación no coinciden',

    // --- auth ----------------------------------------------------------
    'auth.login.heading': 'Bienvenido de nuevo',
    'auth.login.subtext': 'Inicia sesión para seguir planeando tu próximo viaje.',
    'auth.login.cta': 'Iniciar sesión',
    'auth.login.switchPrompt': '¿Nuevo en VoyApp?',
    'auth.login.switchLabel': 'Crear una cuenta',
    'auth.signup.heading': 'Comienza tu historia',
    'auth.signup.subtext': 'Crea una cuenta para comenzar tu próximo itinerario.',
    'auth.signup.cta': 'Crear cuenta',
    'auth.signup.switchPrompt': '¿Ya tienes una cuenta?',
    'auth.signup.switchLabel': 'Inicia sesión',
    'auth.firstName.label': 'Nombre',
    'auth.firstName.placeholder': 'Sofía',
    'auth.lastName.label': 'Apellido',
    'auth.lastName.placeholder': 'Pérez',
    'auth.email.label': 'Correo electrónico',
    'auth.email.placeholder': 'tu@ejemplo.com',
    'auth.password.label': 'Contraseña',
    'auth.newPassword.label': 'Nueva contraseña',
    'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.submitting': 'Espera…',

    // --- forgot / reset password ---------------------------------------
    'forgotPassword.checkInbox': 'Revisa tu bandeja de entrada',
    'forgotPassword.body':
      'Si ese correo está registrado, te enviamos un enlace para restablecer tu contraseña. Es válido por 1 hora.',
    'forgotPassword.backToLogin': 'Volver a iniciar sesión',
    'forgotPassword.heading': 'Restablece tu contraseña',
    'forgotPassword.subtext': 'Ingresa tu correo y te enviaremos un enlace para volver a acceder a tu cuenta.',
    'forgotPassword.sending': 'Enviando…',
    'forgotPassword.sendLink': 'Enviar enlace',
    'forgotPassword.remembered': '¿La recordaste después de todo?',
    'forgotPassword.logIn': 'Iniciar sesión',

    'resetPassword.invalidLink': 'Enlace inválido',
    'resetPassword.invalidLinkBody':
      'A este enlace de restablecimiento le falta el token. Solicita uno nuevo para continuar.',
    'resetPassword.requestNewLink': 'Solicitar un nuevo enlace',
    'resetPassword.heading': 'Elige una nueva contraseña',
    'resetPassword.subtext': 'Ingresa y confirma tu nueva contraseña a continuación.',
    'resetPassword.confirmPassword.label': 'Confirmar contraseña',
    'resetPassword.saveNewPassword': 'Guardar nueva contraseña',

    // --- change password -------------------------------------------------
    'changePassword.title': 'Cambiar contraseña',
    'changePassword.updated': 'Contraseña actualizada.',
    'changePassword.currentPassword.label': 'Contraseña actual',
    'changePassword.confirmPassword.label': 'Confirmar nueva contraseña',

    // --- password input ---------------------------------------------------
    'passwordInput.show': 'Mostrar contraseña',
    'passwordInput.hide': 'Ocultar contraseña',

    // --- dashboard ----------------------------------------------------
    'dashboard.profileAria': 'Perfil',
    'dashboard.yourTrips': 'Tus viajes',
    'dashboard.newTrip': 'Nuevo viaje',
    'dashboard.noTripsYet': 'Aún no tienes viajes — crea el primero arriba.',

    // --- new trip form --------------------------------------------------
    'newTrip.title.label': 'Título del viaje',
    'newTrip.title.placeholder': 'Viaje a Europa {year}',
    'newTrip.startDate.label': 'Fecha de inicio',
    'newTrip.endDate.label': 'Fecha de fin',
    'newTrip.creating': 'Creando…',
    'newTrip.create': 'Crear viaje',

    // --- trip card --------------------------------------------------------
    'tripCard.sharedWithYou': 'Compartido contigo',

    // --- invite accept ------------------------------------------------
    'inviteAccept.invalidOrExpired':
      'Este enlace de invitación no es válido o ha expirado. Pide a quien compartió el viaje que te envíe uno nuevo.',
    'inviteAccept.invitedTo': 'Has sido invitado a "{title}"',
    'inviteAccept.body': 'Podrás {permission} este viaje.',
    'inviteAccept.permissionEditor': 'ver y editar',
    'inviteAccept.permissionViewer': 'ver',
    'inviteAccept.joining': 'Uniéndote…',
    'inviteAccept.acceptInvite': 'Aceptar invitación',
    'inviteAccept.logInPrompt': 'Inicia sesión o crea una cuenta de VoyApp para aceptarla.',
    'inviteAccept.logInToAccept': 'Iniciar sesión para aceptar',
    'inviteAccept.createAccount': 'Crear una cuenta',

    // --- profile ----------------------------------------------------------
    'profile.backAria': 'Volver a tus viajes',
    'profile.heading': 'Perfil',
    'profile.editNameAria': 'Editar nombre',
    'profile.avatarColor.title': 'Color de avatar',
    'profile.avatarColor.useAria': 'Usar {color} como color de avatar',
    'profile.language.title': 'Idioma',
    'profile.logout': 'Cerrar sesión',

    // --- trip detail --------------------------------------------------
    'tripDetail.backToTrips': 'Volver a viajes',
    'tripDetail.tripNotFound': 'Viaje no encontrado.',
    'tripDetail.sharedWith': 'Compartido contigo — {permission}',
    'tripDetail.canEdit': 'puede editar',
    'tripDetail.viewOnly': 'solo ver',
    'tripDetail.share': 'Compartir',
    'tripDetail.noDaysYet': 'Aún no se han agregado días.',
    'tripDetail.addDay': 'Agregar {date}',
    'tripDetail.daysPending': '{count} días pendientes',

    // --- day card -----------------------------------------------------
    'dayCard.viewDayMap': 'Ver mapa del día',
    'dayCard.deleteDay': 'Eliminar día',
    'dayCard.reorderAria': 'Reordenar parada',
    'dayCard.editAria': 'Editar {name}',
    'dayCard.duplicateAria': 'Duplicar {name}',
    'dayCard.removeAria': 'Eliminar {name}',
    'dayCard.viewNotes': 'Ver notas',
    'dayCard.hideNotes': 'Ocultar notas',
    'dayCard.optionalLabel': '(opcional)',
    'dayCard.duplicateStopTitle': 'Duplicar parada',
    'dayCard.duplicateStopMessage': '¿Agregar una copia de "{name}" justo después?',
    'dayCard.duplicate': 'Duplicar',
    'dayCard.duplicating': 'Duplicando…',
    'dayCard.removeStopTitle': 'Eliminar parada',
    'dayCard.removeStopMessage': '¿Seguro que quieres eliminar "{name}"? Esta acción no se puede deshacer.',
    'dayCard.deleteDayTitle': 'Eliminar día',
    'dayCard.deleteDayMessage':
      '¿Seguro que quieres eliminar el {date}? También se eliminarán todas sus paradas. Esta acción no se puede deshacer.',
    'dayCard.dragHere': 'Arrastra una parada aquí',
    'dayCard.noStopsYet': 'Aún no hay paradas',

    // --- stop forms (add/edit) -----------------------------------------
    'stopForm.name.label': 'Nombre de la parada',
    'stopForm.location.label': 'Ubicación',
    'stopForm.startTime.label': 'Hora de inicio (opcional)',
    'stopForm.notes.label': 'Notas (opcional)',
    'stopForm.thisFieldIs': 'Esta parada es:',
    'stopForm.important': 'Importante',
    'stopForm.optional': 'Opcional',
    'stopForm.addStop': 'Agregar parada',
    'stopForm.editStop': 'Editar parada',
    'stopForm.saveChanges': 'Guardar cambios',

    // --- day map modal --------------------------------------------------
    'dayMap.exitFullScreen': 'Salir de pantalla completa',
    'dayMap.viewFullScreen': 'Ver en pantalla completa',

    // --- share modal --------------------------------------------------
    'shareModal.title': 'Compartir {title}',
    'shareModal.viewOnlyLinks': 'Enlaces de solo lectura',
    'shareModal.editorLinks': 'Enlaces de edición',
    'shareModal.copyLinkAria': 'Copiar enlace',
    'shareModal.showQrAria': 'Mostrar código QR',
    'shareModal.copyNow': 'Cópialo ahora — desaparece en {seconds}s',
    'shareModal.revoke': 'Revocar',
    'shareModal.revokeLinkTitle': 'Revocar enlace',
    'shareModal.revokeLinkMessage':
      'A partir de ahora, cualquiera que abra este enlace específico será rechazado. Los demás enlaces, y las personas que ya se unieron, no se ven afectados.',
    'shareModal.generating': 'Generando…',
    'shareModal.waitSeconds': 'Espera {seconds}s',
    'shareModal.newLink': 'Nuevo enlace',
    'shareModal.linkAlreadyShown':
      'Se generó un enlace, pero ya se mostró una vez - genera uno nuevo para compartirlo de nuevo.',
    'shareModal.noLinksYet': 'Aún no hay enlaces de {kind}.',
    'shareModal.editorWord': 'edición',
    'shareModal.viewOnlyWord': 'solo lectura',
    'shareModal.canView': 'Puede ver',
    'shareModal.canEdit': 'Puede editar',
    'shareModal.removeAria': 'Eliminar {email}',
    'shareModal.removeAccessTitle': 'Eliminar acceso',
    'shareModal.removeAccessMessage': '{email} ya no podrá ver ni editar este viaje.',
    'shareModal.remove': 'Eliminar',
    'shareModal.peopleWithAccess': 'Personas con acceso ({count}/{max})',
    'shareModal.noOneAccepted': 'Aún nadie ha aceptado una invitación.',

    // --- QR code -------------------------------------------------------
    'qrCode.error': 'No se pudo generar el código QR.',
    'qrCode.alt': 'Escanea para abrir este enlace',

    // --- map picker ------------------------------------------------------
    'mapPicker.searchPlaceholder': 'Buscar un lugar…',
    'mapPicker.searching': 'Buscando…',
    'mapPicker.selected': 'Seleccionado: {lat}, {lng}',
    'mapPicker.prompt': 'Busca o toca el mapa para elegir una ubicación.',
  },
}
