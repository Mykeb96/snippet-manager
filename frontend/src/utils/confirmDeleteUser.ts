import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

export async function confirmDeleteUser(username: string, email: string): Promise<boolean> {
  const label = username || email
  const result = await Swal.fire({
    title: 'Delete this user?',
    html: `Remove <strong>${escapeHtml(label)}</strong> and <strong>all of their snippets</strong>? This cannot be undone.`,
    icon: 'warning',
    showCancelButton: true,
    showCloseButton: true,
    confirmButtonText: 'Delete user',
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
