/* «Ferma le animazioni», prima del primo disegno (MOTION.md §L3.1, ML15).
   Chi l'ha scelto in una visita passata non deve vedere la scena muoversi per
   i 200-300ms che servono al modulo. La CSP vieta gli script in linea, quindi
   questo è un file classico e bloccante nel <head>: legge la scelta salvata
   (in try/catch: senza memoria, ogni visita è la prima) e mette l'attributo
   sull'<html>. Il resto lo fa presentazione/js/movimento.ts. Sta in public/
   perché Vite non tocca gli script classici: arriva così com'è. */
try {
  if (window.localStorage.getItem('bvd_landing_fermo') === '1') document.documentElement.setAttribute('data-movimento', 'fermo')
} catch (e) {
  /* memoria non disponibile: il movimento resta acceso */
}
