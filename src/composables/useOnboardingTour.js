import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export function useOnboardingTour(changeTab) {
  
  const chatterSteps = [
    {
      popover: {
        title: 'Bienvenido a ESSENZA',
        description: 'Este recorrido te mostrará cómo gestionar tu turno de trabajo.'
      }
    },
    {
      element: '[data-tour="shift-status"]',
      popover: {
        title: 'Iniciar/Finalizar turno',
        description: 'Presiona "Iniciar turno" antes de comenzar a trabajar. El sistema registrará automáticamente tu tiempo activo, pausas e inactividad.'
      }
    },
    {
      element: '[data-tour="current-assignment"]',
      popover: {
        title: 'Registro del turno',
        description: 'Durante tu turno, completa esta información: observaciones generales, contenido vendido (tags) y spenders principales. Todo se guardará en tu reporte final.'
      }
    },
    {
      element: '[data-tour="history"]',
      popover: {
        title: 'Historial del turno actual',
        description: 'Aquí ves el historial de spenders que tuviste asignados durante este turno. Se actualiza automáticamente.'
      }
    },
    {
      element: '[data-tour="logbook"]',
      popover: {
        title: 'Notas personales',
        description: 'Escribe aquí información importante durante el turno. Al finalizar, estas notas se incluirán automáticamente en tu reporte.'
      }
    },
    {
      popover: {
        title: '¡Listo!',
        description: 'Ya sabes cómo gestionar tu turno. Puedes volver a ver este recorrido desde el botón de ayuda (?) en la barra superior.'
      }
    }
  ]

  function startTour() {
    const driverObj = driver({
      showProgress: true,
      steps: chatterSteps,
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Finalizar',
      smoothScroll: true,
      allowClose: true,
      overlayClickNext: false,
      onDestroyed: () => {
        markAsCompleted()
      },
      onHighlightStarted: (element) => {
        if (element) {
          const scrollParent = findScrollParent(element)
          if (scrollParent && scrollParent !== document.body && scrollParent !== document.documentElement) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }
    })

    driverObj.drive()
  }

  function findScrollParent(element) {
    if (!element) return null
    
    let parent = element.parentElement
    while (parent) {
      const overflow = window.getComputedStyle(parent).overflow
      const overflowY = window.getComputedStyle(parent).overflowY
      
      if (overflow === 'auto' || overflow === 'scroll' || overflowY === 'auto' || overflowY === 'scroll') {
        return parent
      }
      parent = parent.parentElement
    }
    return null
  }

  function hasCompletedTour() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!user.username) return false
    return localStorage.getItem(`tour_completed_${user.username}`) === 'true'
  }

  function markAsCompleted() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.username) {
      localStorage.setItem(`tour_completed_${user.username}`, 'true')
    }
  }

  function resetTour() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.username) {
      localStorage.removeItem(`tour_completed_${user.username}`)
    }
  }

  return {
    startTour,
    hasCompletedTour,
    markAsCompleted,
    resetTour
  }
}
