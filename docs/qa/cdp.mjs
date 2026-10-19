// ============================================================================
// Pilota minimo di Chrome headless via CDP (Node ≥ 22: WebSocket e fetch
// globali, nessuna dipendenza). Lo usano gli script di questa cartella.
//
//   CHROME   eseguibile di Chrome (default: quello di macOS)
//   BASE     l'anteprima da misurare (default: dev server Vite su 5173)
//   QA_OUT   dove finiscono screenshot e profilo di Chrome (default: tmp)
//
// Chrome headless dichiara una connessione lenta: qui `navigator.connection`
// risponde 4g, altrimenti il toast «Connessione lenta» copre la NavBar in
// ogni screenshot (SLOWNET=1 per tenerlo).
// ============================================================================
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
export const SP = process.env.QA_OUT ?? join(tmpdir(), 'bvd-qa')
export const BASE = process.env.BASE ?? 'http://localhost:5173/docs/preview/'

let chromeProc = null
export async function launch(port = 9333, extra = []) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/json/version`)
    if (r.ok) return port
  } catch {}
  mkdirSync(`${SP}/chrome-prof-${port}`, { recursive: true })
  mkdirSync(SP, { recursive: true })
  chromeProc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${SP}/chrome-prof-${port}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--window-size=1280,900', ...extra,
  ], { stdio: 'ignore', detached: true })
  chromeProc.unref()
  writeFileSync(`${SP}/chrome-${port}.pid`, String(chromeProc.pid))
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (r.ok) return port
    } catch {}
    await sleep(100)
  }
  throw new Error('chrome did not start')
}

export async function page(port = 9333) {
  const r = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
  const t = await r.json()
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let id = 0
  const pending = new Map()
  const listeners = new Map()
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result)
    } else if (msg.method) {
      for (const fn of listeners.get(msg.method) ?? []) fn(msg.params)
    }
  }
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id
    pending.set(i, { res, rej })
    ws.send(JSON.stringify({ id: i, method, params }))
  })
  const on = (method, fn) => {
    if (!listeners.has(method)) listeners.set(method, [])
    listeners.get(method).push(fn)
  }
  const once = (method, timeout = 15000) => new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout ' + method)), timeout)
    on(method, (p) => { clearTimeout(t); res(p) })
  })
  await send('Page.enable')
  await send('Runtime.enable')
  if (!process.env.SLOWNET) await send('Page.addScriptToEvaluateOnNewDocument', { source: "Object.defineProperty(navigator,'connection',{configurable:true,get:()=>({effectiveType:'4g',saveData:false,addEventListener(){},removeEventListener(){}})})" })
  const consoleMsgs = []
  on('Runtime.consoleAPICalled', (p) => consoleMsgs.push(`[${p.type}] ` + p.args.map((a) => a.value ?? a.description ?? '').join(' ')))
  on('Runtime.exceptionThrown', (p) => consoleMsgs.push('[exception] ' + (p.exceptionDetails.exception?.description ?? p.exceptionDetails.text)))

  const P = {
    send, on, once, consoleMsgs, targetId: t.id,
    async viewport(width, height, { mobile = width < 900, dpr = mobile ? 3 : 1, touch = mobile } = {}) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile })
      await send('Emulation.setTouchEmulationEnabled', touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false })
    },
    async media(features) {
      await send('Emulation.setEmulatedMedia', { features })
    },
    async go(url, settle = 600) {
      const loaded = once('Page.loadEventFired', 30000)
      await send('Page.navigate', { url })
      await loaded
      await sleep(settle)
    },
    async eval(expr, awaitPromise = true) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true })
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
      return r.result.value
    },
    async shot(name, opts = {}) {
      const r = await send('Page.captureScreenshot', { format: 'png', ...opts })
      mkdirSync(`${SP}/shots`, { recursive: true })
      const f = `${SP}/shots/${name}.png`
      writeFileSync(f, Buffer.from(r.data, 'base64'))
      return f
    },
    async key(key, { shift = false, code, text } = {}) {
      const map = { Tab: [9, 'Tab'], Enter: [13, 'Enter'], Escape: [27, 'Escape'], ' ': [32, 'Space'], ArrowDown: [40, 'ArrowDown'], ArrowUp: [38, 'ArrowUp'], ArrowLeft: [37, 'ArrowLeft'], ArrowRight: [39, 'ArrowRight'], Home: [36, 'Home'], End: [35, 'End'] }
      const [kc, c] = map[key] ?? [0, code ?? key]
      const mods = shift ? 8 : 0
      const t = text ?? (key === 'Enter' ? '\r' : key === ' ' ? ' ' : undefined)
      await send('Input.dispatchKeyEvent', { type: t ? 'keyDown' : 'rawKeyDown', key, code: c, windowsVirtualKeyCode: kc, modifiers: mods, text: t })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: c, windowsVirtualKeyCode: kc, modifiers: mods })
    },
    async type(s) { await send('Input.insertText', { text: s }) },
    async click(x, y) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
    },
    async tap(x, y) {
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    },
    async clickSel(sel) {
      const b = await P.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({block:'center'}); const r = e.getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2] })()`)
      if (!b) throw new Error('no element ' + sel)
      await P.click(b[0], b[1])
    },
    async close() {
      try { await fetch(`http://127.0.0.1:${port}/json/close/${t.id}`) } catch {}
      ws.close()
    },
  }
  return P
}

export { sleep }
