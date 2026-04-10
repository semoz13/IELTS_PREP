import Swal from 'sweetalert2'

type ToastType = 'success' | 'error' | 'warning' | 'info'

export const toast = (type: ToastType, message: string): void => {
  Swal.fire({
    icon: type,
    text: message,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  })
}
export const treatError = (err: any): void => {
  const message = err?.response?.data?.message || err?.message || 'Something went wrong'
  Swal.fire({
    icon: 'error',
    title: 'Oops...',
    text: message,
  })
}
