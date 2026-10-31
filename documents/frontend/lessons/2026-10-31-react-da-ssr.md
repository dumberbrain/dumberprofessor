---
title: React-da SSR
type: lesson
domain: frontend
date: 2026-10-31
sources:
  - https://react.dev/reference/react-dom/client/hydrateRoot
  - https://react.dev/reference/react-dom/server/renderToPipeableStream
---

# React-da SSR

**Məqsəd:** SSR, CSR və hydration fərqini izah etmək; hydration mismatch səbəblərini tapıb düzəltmək; streaming SSR və Suspense-in rolunu anlamaq.
**Ön bilik:** React component və hooks; brauzerin HTML və JS yükləmə ardıcıllığı.

## İzah və mental model

**CSR (client-side rendering)** — server boş `<div id="root">` göndərir, brauzer JS bundle-ı yükləyir, React DOM-u sıfırdan qurur. JS gələnə qədər ağ ekran; crawler boş səhifə görür.

**SSR (server-side rendering)** — React component-ləri **serverdə** HTML string-ə çevirir. Brauzer dərhal məzmun görür (FCP/LCP yaxşı, SEO üçün yaxşı). Amma HTML "ölüdür" — `onClick` işləmir.

**Hydration** — client-də eyni `<App />` yenidən render olunur, amma React DOM-u **yaratmır**: mövcud HTML-in üzərindən keçir, event handler-ləri bağlayır, state-i qoşur. `hydrateRoot` ilə (`createRoot` yox — o, HTML-i atıb sıfırdan qurur).

**Mental model:** server **fotoşəkil** göndərir, hydration fotoşəkili **canlandırır**. React yoxlayır: "məndə çıxan = fotoşəkildəki?" Fərq olsa — **hydration mismatch**: ən yaxşı halda yavaşlama, ən pis halda event handler səhv elementə bağlanır. Fərqli mətn məzmununu React patch etmir.

**Streaming SSR** — bütün səhifəni gözləmək lazım deyil. Əvvəl **shell** (`<Suspense>`-dən kənar hər şey) gedir, hər Suspense boundary əvvəl fallback göndərir, data hazır olanda React həmin hissənin HTML-ini + inline `<script>` stream edir və fallback-i əvəz edir. Yavaş hissə bütün səhifəni bloklamır.

## Nümunə: Node server + client

```jsx
// server.js
import { renderToPipeableStream } from 'react-dom/server';

app.get('/', (req, res) => {
  let didError = false;
  const { pipe, abort } = renderToPipeableStream(<App />, {
    bootstrapScripts: ['/main.js'],          // hydrateRoot çağıran bundle
    onShellReady() {                          // shell hazır → stream başlasın
      res.statusCode = didError ? 500 : 200;
      res.setHeader('content-type', 'text/html');
      pipe(res);
    },
    onShellError() {                          // shell çökdü → heç bayt getməyib
      res.statusCode = 500;
      res.send('<h1>Xəta</h1>');
    },
    onError(err) { didError = true; console.error(err); },
  });
  setTimeout(abort, 10_000);                  // 10 san → qalanı client render etsin
});

// App.jsx
export default function App() {
  return (
    <html><body>
      <Header />                              {/* shell: dərhal gedir */}
      <Suspense fallback={<Spinner />}>
        <Comments />                          {/* yavaş data: sonra stream olunur */}
      </Suspense>
    </body></html>
  );
}

// main.js (client)
import { hydrateRoot } from 'react-dom/client';
hydrateRoot(document, <App />);
```

Praktikada bunu çox vaxt framework edir (Next.js, React Router v7, Remix), amma altda eyni mexanizm işləyir.

## Detallar və edge case-lər

**1. Mismatch-in tipik səbəbləri** (server ≠ client):
- Render zamanı `typeof window !== 'undefined'` yoxlaması.
- Render zamanı browser-only API: `localStorage`, `window.matchMedia`, `navigator`.
- Qeyri-deterministik dəyər: `Date.now()`, `Math.random()`, timezone/locale formatlama (`toLocaleString`).
- Server və client-də fərqli data.
- Root daxilində React-in yaratmadığı whitespace/newline.
- *mənbəsiz:* səhv HTML nesting (`<p>` içində `<div>`) — brauzer parser "düzəldir", DOM fərqlənir. Brauzer extension-ları DOM-u dəyişə bilər.

**2. Düzəliş yolları:**
- **Data-nı serverdən ötür** — serverin istifadə etdiyi data HTML-ə serialize olunur, client eyni data ilə hydrate edir (framework-lər bunu edir).
- **`useId`** — `Math.random()` id əvəzinə; server və client-də eyni id. *(mənbəsiz)*
- **Two-pass render** — ilk render serverlə eyni, sonra `useEffect`-də `setIsClient(true)` → client-only məzmun. Qiyməti: əlavə render + mümkün flicker.
- **`suppressHydrationWarning`** — yalnız bir səviyyə, qaçılmaz fərq üçün (timestamp). Escape hatch, hər yerə yox.

**3. Streaming tələləri:**
- **Status code** — ilk bayt `pipe` olunandan sonra dəyişmir. `didError` yalnız shell xətalarını tutur; Suspense içində sonradan gələn xəta 200 ilə gedəcək.
- **Suspense içində xəta** — render dayanmır: fallback göndərilir, həmin hissə client-də yenidən cəhd olunur (`onShellReady` yenə çağırılır).
- **Suspense-i nə tetikləyir** — yalnız suspending data mənbəyi (`use(promise)`, framework loader). `useEffect` içində fetch serverdə **işləmir** — SSR HTML-də o data olmayacaq.
- **Crawler / SSG** — `onAllReady`: hamısı hazır olanda tam HTML.
- **`root.render` hydration bitməmiş çağırılsa** — server HTML atılır, bütün root client render-ə keçir.

### Trade-off-lar
- **SSR**: FCP/LCP və SEO yaxşı ↔ server CPU xərci, TTFB arta bilər, hosting mürəkkəbləşir.
- **"Uncanny valley"** *(mənbəsiz)*: səhifə görünür, amma JS yüklənməyib — düymələr işləmir. SSR görünüşü sürətləndirir, interaktivliyi yox.
- **Bundle yenə gedir** — hydration üçün bütün component JS-i client-ə lazımdır. React Server Components (RSC) bunu azaltmaq üçündür.
- **Alternativ**: dəyişməyən səhifələrə SSG (build vaxtı HTML); login arxası dashboard-a çox vaxt CSR kifayətdir.

### Tez-tez səhvlər
- SSR HTML üzərində `createRoot` → HTML atılır, SSR faydası itir.
- Render zamanı `localStorage`/`window` → serverdə crash və ya mismatch.
- SSR data-sını `useEffect`-də fetch etmək.
- Status code-u `pipe`-dan sonra təyin etməyə çalışmaq.
- **Təhlükəsizlik (mənbəsiz):** server data-sını `<script>window.__DATA__ = ${JSON.stringify(data)}</script>` ilə escape etmədən yazmaq. Data-da `</script><script>...` olsa → XSS. `<`, `>`, `/` escape edən serializer (məs. `serialize-javascript`) və ya framework-ün mexanizmi.

## Quiz

**Tapşırıq.** CSR / SSR / SSG seç: (a) şirkət blogu (SEO vacib, həftədə 1 yazı); (b) login arxasında admin dashboard; (c) məhsul səhifəsi (SEO vacib, stok canlı dəyişir).
- *Cavabın:* a SSG, b CSR, c CSR (səbəb yazılmayıb).
- *Düzgün cavab:* (a) SSG ✅ — nadir dəyişir, build vaxtı HTML. (b) CSR ✅ — SEO lazım deyil. (c) **SSR** (və ya SSG/ISR + stok client-də fetch) — SEO üçün crawler boş `<div>` görməməlidir; canlı data CSR tələb etmir, yalnız stok hissəsi client-də yenilənir.

**1. (conceptual)** `hydrateRoot` ilə `createRoot` fərqi? Server HTML-i olan səhifədə `createRoot` çağırsan nə olar?
- *Cavabın:* hydrate cansız DOM-u canlandırır; createRoot DOM-u yenidən qurur.
- *Düzgün cavab (✅):* `hydrateRoot` mövcud DOM-u saxlayıb event handler bağlayır; `createRoot` server HTML-i atıb sıfırdan qurur — SSR faydası itir, flicker ola bilər.

**2. (code-reading)** `Feed` 1 san, `Comments` 5 san sonra hazır olur. İlk baytlarda nə gedir? 2-ci saniyədə istifadəçi nə görür?
```jsx
<Layout>
  <Nav />
  <Suspense fallback={<p>Yüklənir...</p>}>
    <Feed />
    <Suspense fallback={<p>Şərhlər...</p>}>
      <Comments />
    </Suspense>
  </Suspense>
  <Footer />
</Layout>
```
- *Cavabın:* 2-ci saniyədə Feed görünür, şərhlər hələ yüklənməyib.
- *Düzgün cavab (qismən):* ilk gedən **shell**: Layout, `Nav`, `Footer` + xarici fallback **"Yüklənir..."** (`Footer` Suspense-dən kənardadır, Feed-i gözləmir). 2-ci saniyədə Feed görünür, Comments yerində **"Şərhlər..."** fallback-i.

**3. (debugging)** `localStorage.getItem('name')` render-də oxunur → serverdə `ReferenceError: localStorage is not defined`. Developer `typeof window !== 'undefined' ? ... : null` ilə "düzəldir" → indi hydration mismatch. Niyə, düzgün düzəliş?
- *Cavabın:* `'use client'` direktivi ilə.
- *Düzgün cavab (❌):* `'use client'` RSC direktividir — component client bundle-a düşür, amma **yenə serverdə SSR olunur**. Mismatch səbəbi: server `window` görmür → "Salam, Qonaq"; client `localStorage`-dan → "Salam, Javid"; mətn fərqlidir. Düzəliş — two-pass:

```jsx
function Greeting() {
  const [name, setName] = useState('Qonaq');      // server = client ilk render
  useEffect(() => {
    setName(localStorage.getItem('name') ?? 'Qonaq'); // hydration-dan sonra
  }, []);
  return <p>Salam, {name}</p>;
}
```

Alternativ: adı **cookie**-də saxla, server oxusun → server və client eyni render edir, flicker yoxdur.

## Nəticə

- **Bal:** 1/3 · status: learning · confidence low
- **Güclü tərəflər:** hydrateRoot vs createRoot fərqi; SSG və CSR seçimi; Suspense boundary-nin fallback göstərməsi
- **Boşluqlar:** `'use client'` komponenti SSR-dən çıxarmır; SEO lazım olan canlı data səhifəsinə SSR lazımdır, CSR yox; streaming-də shell = Suspense-dən kənar hər şey, ilk gedir
- **Növbəti təkrar:** 2026-11-01

## Mənbələr

- [react.dev — hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot) — mismatch səbəbləri, `suppressHydrationWarning`, two-pass render (versiya/tarix yoxdur; baxış 2026-10-31).
- [react.dev — renderToPipeableStream](https://react.dev/reference/react-dom/server/renderToPipeableStream) — shell, Suspense streaming, error handling, status code (versiya/tarix yoxdur; baxış 2026-10-31).
- Uncanny valley, HTML nesting, extension-lar, XSS serialize, `useId` qeydi — mənbəsiz.
