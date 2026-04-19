import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

function previewTitle(title: string): string {
  const t = title.trim()
  if (!t) return ''
  return t.length > 90 ? `${t.slice(0, 90)}…` : t
}

export async function confirmDeleteSnippet(snippetTitle: string): Promise<boolean> {
  const preview = previewTitle(snippetTitle)
  const text = preview
    ? `This cannot be undone. The snippet “${preview}” will be permanently removed.`
    : 'This snippet will be permanently removed. This cannot be undone.'

  const result = await Swal.fire({
    title: 'Delete this snippet?',
    text,
    showCancelButton: true,
    showCloseButton: true,
    confirmButtonText: 'Delete',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    focusCancel: true,
    buttonsStyling: false,
    customClass: {
      container: 'swal-app-container',
      popup: 'swal-app',
      title: 'swal-app__title',
      htmlContainer: 'swal-app__html',
      confirmButton: 'swal-app__btn swal-app__btn--danger',
      cancelButton: 'swal-app__btn swal-app__btn--cancel',
      closeButton: 'swal-app__close',
    },
  })

  return result.isConfirmed
}
