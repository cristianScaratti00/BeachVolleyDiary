/* Landing pubblica di Beach Volley Diary.
 *
 * Vive fuori dall'app: nessun React, nessun Supabase, nessun import dal
 * bundle di /src. Qui dentro c'è solo quello che la pagina fa da sola —
 * le animazioni portate dal design canvas e il pulsante "Aggiungi a Home".
 */

const EASE = 'cubic-bezier(.22,1,.36,1)' // spring-ish out
const SOFT = 'cubic-bezier(.34,1.4,.64,1)' // leggero overshoot
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ---------------------------------------------------------------- observer

const callbacks = new WeakMap()
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return
      const cb = callbacks.get(e.target)
      io.unobserve(e.target)
      if (cb) cb()
    })
  },
  { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
)

function observe(el, fn) {
  callbacks.set(el, fn)
  io.observe(el)
}

// ---------------------------------------------------------------- reveals

function setupReveals() {
  if (reduced) return
  document.querySelectorAll('[data-bvd-reveal]').forEach((el) => {
    // Le card della stessa griglia entrano a cascata: l'indice tra i fratelli
    // diventa il ritardo.
    const sibs = el.parentElement
      ? [...el.parentElement.querySelectorAll(':scope > [data-bvd-reveal]')]
      : [el]
    const delay = Math.max(0, sibs.indexOf(el)) * 70
    el.style.opacity = '0'
    el.style.transform = 'translate3d(0,22px,0)'
    el.style.willChange = 'opacity, transform'
    observe(el, () => {
      el.style.transition = `opacity .7s ${EASE} ${delay}ms, transform .8s ${EASE} ${delay}ms`
      el.style.opacity = '1'
      el.style.transform = 'translate3d(0,0,0)'
      setTimeout(() => {
        el.style.willChange = 'auto'
      }, 900 + delay)
    })
  })
}

// --------------------------------------------------------------- contatori

function setupCounters() {
  if (reduced) return
  document.querySelectorAll('[data-bvd-count]').forEach((el) => {
    const target = parseFloat(el.dataset.bvdCount)
    const prefix = el.dataset.bvdPrefix || ''
    el.textContent = prefix + '0'
    observe(el, () => {
      const dur = 1100
      const t0 = performance.now()
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur)
        const eased = 1 - Math.pow(1 - p, 3)
        el.textContent = prefix + Math.round(target * eased)
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    })
  })
}

// ------------------------------------------------------------------ barre

function setupBars() {
  if (reduced) return
  document.querySelectorAll('[data-bvd-bars]').forEach((wrap) => {
    const bars = [...wrap.querySelectorAll(':scope > div > div')]
    const heights = bars.map((b) => b.style.height)
    bars.forEach((b) => {
      b.style.height = '0px'
      b.style.transformOrigin = 'bottom'
    })
    observe(wrap, () => {
      bars.forEach((b, i) => {
        b.style.transition = `height .85s ${SOFT} ${i * 90}ms`
        b.style.height = heights[i]
      })
    })
  })
}

// -------------------------------------------------------------- carosello

function setupCarousel() {
  const car = document.querySelector('[data-bvd-carousel]')
  if (!car) return
  const slides = [...car.querySelectorAll('[data-bvd-slide]')]
  const dots = [...document.querySelectorAll('[data-bvd-dot]')]
  const caption = document.querySelector('[data-bvd-caption]')
  const labels = ['Home · dashboard', 'Tornei e mappa', 'Storia Instagram']
  if (slides.length < 2) return

  let i = 0
  let dir = 1
  let timer = null

  const show = (n, d) => {
    dir = d
    slides.forEach((s, k) => {
      const active = k === n
      s.style.transition = `opacity .55s ${EASE}, transform .7s ${EASE}`
      s.style.opacity = active ? '1' : '0'
      s.style.transform = active
        ? 'translate3d(0,0,0) scale(1)'
        : `translate3d(${dir * 26}px,0,0) scale(.97)`
      s.style.pointerEvents = active ? 'auto' : 'none'
    })
    dots.forEach((b, k) => {
      const bar = b.firstElementChild
      if (!bar) return
      bar.style.width = k === n ? '26px' : '10px'
      bar.style.background = k === n ? '#FF6B35' : 'rgba(27,42,74,.22)'
    })
    if (caption) {
      caption.style.opacity = '0'
      setTimeout(() => {
        caption.textContent = labels[n] || ''
        caption.style.opacity = '1'
      }, 180)
    }
    i = n
  }

  const advance = () => show((i + 1) % slides.length, 1)
  const start = () => {
    if (reduced) return
    if (timer) clearInterval(timer)
    timer = setInterval(() => {
      if (!document.hidden) advance()
    }, 4200)
  }

  dots.forEach((b, k) =>
    b.addEventListener('click', () => {
      show(k, k > i ? 1 : -1)
      start()
    }),
  )

  // swipe sul telaio del telefono (l'app è usata soprattutto da mobile)
  let x0 = null
  car.addEventListener(
    'touchstart',
    (e) => {
      x0 = e.touches[0].clientX
    },
    { passive: true },
  )
  car.addEventListener(
    'touchend',
    (e) => {
      if (x0 === null) return
      const dx = e.changedTouches[0].clientX - x0
      if (Math.abs(dx) > 40) {
        show((i + (dx < 0 ? 1 : slides.length - 1)) % slides.length, dx < 0 ? 1 : -1)
        start()
      }
      x0 = null
    },
    { passive: true },
  )

  show(0, 1)
  start()
}

// --------------------------------------------------- "Aggiungi alla Home"

function setupInstall() {
  const buttons = [...document.querySelectorAll('[data-bvd-install]')]
  const sheet = document.querySelector('[data-bvd-sheet]')
  if (!buttons.length) return

  // Già installata: aperta dall'icona in Home invece che dal browser.
  const installed =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true

  // iOS/iPadOS non implementa `beforeinstallprompt`: lì non esiste un'API per
  // installare, si può solo spiegare il percorso Condividi → Aggiungi a Home.
  // iPadOS si dichiara "MacIntel", va distinto dal Mac vero col touch.
  const isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  let deferred = null
  const setShown = (on) => buttons.forEach((b) => (b.hidden = !on))

  window.addEventListener('beforeinstallprompt', (e) => {
    // Blocca il mini-infobar di Chrome: il prompt lo lanciamo noi dal pulsante.
    e.preventDefault()
    deferred = e
    if (!installed) setShown(true)
  })

  window.addEventListener('appinstalled', () => {
    deferred = null
    setShown(false)
  })

  if (!installed && isIOS) setShown(true)

  // -- foglio istruzioni --
  let lastFocused = null
  const openSheet = (variant) => {
    if (!sheet) return
    sheet.querySelectorAll('[data-bvd-steps]').forEach((ol) => {
      ol.hidden = ol.dataset.bvdSteps !== variant
    })
    lastFocused = document.activeElement
    sheet.hidden = false
    document.body.style.overflow = 'hidden'
    const close = sheet.querySelector('[data-bvd-sheet-close]')
    if (close) close.focus()
  }
  const closeSheet = () => {
    if (!sheet || sheet.hidden) return
    sheet.hidden = true
    document.body.style.overflow = ''
    if (lastFocused && lastFocused.focus) lastFocused.focus()
  }

  if (sheet) {
    sheet.addEventListener('click', (e) => {
      if (e.target === sheet) closeSheet()
    })
    sheet
      .querySelectorAll('[data-bvd-sheet-close]')
      .forEach((b) => b.addEventListener('click', closeSheet))
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSheet()
    })
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!deferred) {
        openSheet(isIOS ? 'ios' : 'altro')
        return
      }
      try {
        await deferred.prompt()
        await deferred.userChoice
        // Il prompt si consuma comunque, accettato o no: nascondiamo i
        // pulsanti e li rimostriamo alla prossima visita, se Chrome rilancia
        // l'evento. Meglio che insistere.
        deferred = null
        setShown(false)
      } catch {
        // Il prompt nativo non è partito (gesto perso, evento già consumato).
        // `deferred` resta lì per un eventuale nuovo click, ma intanto
        // spieghiamo la strada manuale: un pulsante muto sarebbe peggio.
        openSheet(isIOS ? 'ios' : 'altro')
      }
    })
  })
}

// ------------------------------------------------------------------ setup

setupReveals()
setupCounters()
setupBars()
setupCarousel()
setupInstall()

// Il service worker serve a rendere il sito installabile e a dare una pagina
// di cortesia offline: vedi public/sw.js, non mette in cache i bundle.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  })
}
