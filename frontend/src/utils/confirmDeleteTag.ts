import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

export async function confirmDeleteTag(displayName: string): Promise<boolean> {
  const result = await Swal.fire({
    title: 'Delete this tag?',
    text: `Remove “${displayName}” from the catalog? It will be stripped from any snippets that use it.`,
    icon: 'warning',
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
