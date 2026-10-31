---
title: Senior developer kimi code review
type: lesson
domain: frontend
date: 2026-10-31
sources:
  - https://google.github.io/eng-practices/review/
---

# Senior developer kimi code review

**Məqsəd:** PR-ı prioritetə görə review etmək, actionable comment yazmaq, frontend riskləri tapmaq.
**Prerequisites:** Git diff və PR axını · React/TypeScript əsasları (bax: [React-da SSR](../../frontend/lessons/2026-10-31-react-da-ssr.md)).

## Mental model: review filtrdir, yazım yoxlaması deyil

Junior review: "burada boşluq artıqdır", "adı dəyiş". Senior review: **"bu dəyişiklik merge olunsa nə qırılar?"**

Prioritet piramidası:

1. **Correctness:** bug, race condition, edge case (boş list, `null`, xəta, loading).
2. **Design:** abstraction, state harada yaşayır, coupling.
3. **Risk:** security (XSS, secret), performance, a11y, backward compatibility.
4. **Tests:** dəyişən davranış test olunubmu?
5. **Readability:** ad, struktur, comment.
6. **Style:** linter işidir, insan işi deyil.

Əsas qayda: PR kodu mükəmməl etməli deyil, kod bazasını daha yaxşı etməlidir. Qısa PR-ı tez təsdiqlə, böyük PR-ı bölməyi xahiş et.

**Comment-in anatomiyası:** severity + problem + niyə + təklif.

- `blocker:` merge-dən əvvəl düzəlməlidir
- `suggestion:` yaxşılaşdırma, müzakirəyə açıqdır
- `nit:` kiçik, məcburi deyil
- `question:` başa düşmək üçün sual

## Nümunə

```tsx
function UserList({ teamId }: { teamId: string }) {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/teams/${teamId}/users`)
      .then(r => r.json())
      .then(setUsers);
  }, []);

  return users.map(u => <div dangerouslySetInnerHTML={{ __html: u.bio }} />);
}
```

Senior review:

- `blocker:` `dangerouslySetInnerHTML` ilə istifadəçi datası (`bio`) render olunur, bu XSS-dir. Düz text render et və ya sanitize et (DOMPurify).
- `blocker:` `useEffect` deps-də `teamId` yoxdur, team dəyişəndə köhnə list qalır. Race condition da var. Cleanup və ya TanStack Query istifadə et.
- `suggestion:` `r.ok` yoxlanılmır, error/loading state yoxdur.
- `suggestion:` `key` yoxdur. `key={u.id}` əlavə et.
- `nit:` `any[]` əvəzinə `User[]` yaz.

## Detallar və edge case-lər

**Review-a necə başlamalı:** əvvəlcə PR description və ticket-i oxu, sonra əsas məntiq olan faylı, ən sonda test və config-i. UI dəyişikliyində branch-ı lokal qaldır.

**Diff-də görünməyən şeylər:**

- Silinmiş kod: hansı davranış itdi?
- Dəyişən funksiyanı kim çağırır? Signature dəyişibsə, bütün çağırışları axtar.
- Diff-də olmayan, amma olmalı olanlar: test, migration, error handling, i18n, a11y.

**Frontend yoxlama siyahısı:**

- State: loading / error / empty / stale
- Effect-lər: deps, cleanup, race condition, effect ümumiyyətlə lazımdırmı?
- Render: lazımsız re-render, `key`, böyük bundle import
- A11y: `div onClick`, `label` yoxdur, focus idarəsi
- Security: `dangerouslySetInnerHTML`, `javascript:` href, client-ə gedən secret
- Next.js: server kodu client bundle-a sızırmı?

## Trade-off-lar

- **Sürət ↔ dərinlik:** dərinliyi riskə görə seç. Auth və ödəniş dərin, copy dəyişikliyi səthi.
- **Blocker ↔ follow-up:** problem bu PR-da yaranmayıbsa, merge-i bloklama, ayrı ticket aç.
- **Öz zövqün ↔ team standartı:** "mən belə yazardım" blocker deyil.

## Tipik səhvlər

- 30 nit, 0 bug
- Kodu oxumadan "LGTM" yazmaq (rubber stamp)
- Comment-i şəxsə yönəltmək, koda yox
- Səbəbsiz "bunu dəyiş" yazmaq
- Böyük PR-ı bölməyi xahiş etmək əvəzinə hamısını review etmək
- Yaxşı həlli qeyd etməmək

## Quiz

```tsx
function Search() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Item[]>([]);

  useEffect(() => {
    fetch(`/api/search?q=${q}`).then(r => r.json()).then(setResults);
  }, [q]);

  return (
    <>
      <input value={q} onChange={e => setQ(e.target.value)} />
      {results.map(r => <a href={r.url} key={r.id}>{r.title}</a>)}
    </>
  );
}
```

**Tapşırıq:** ən vacib problem üçün senior comment yaz.

- İstifadəçi: ayrıca comment yazmadı.
- Nümunə: `blocker:` `useEffect`-də cleanup yoxdur, hər hərfdə request gedir və cavablar sırasız qayıda bilər. Köhnə nəticə ekranda qalır. `AbortController` və ya TanStack Query (`queryKey: ['search', q]`) istifadə et.

**1. (conceptual)** 1 race condition və 12 adlandırma problemi var. Hansı sıra və severity ilə yazardın?

- İstifadəçi: race condition birinci gəlir, çünki davranışı pozur.
- Qiymət: doğru. Adlandırma problemləri tək bir `nit:` comment ilə yazılmalı və ya linter qaydası təklif olunmalıdır.

**2. (code-reading)** `Search`-də ən azı 3 problem tap.

- İstifadəçi: error handling.
- Qiymət: qismən doğru. Qaçırılanlar:
  - Race condition (cleanup və abort yoxdur), boş `q` ilə request, debounce yoxdur.
  - Security: `href={r.url}`-də `javascript:` linki XSS yaradır, protokolu yoxla. `q` encode olunmur, `encodeURIComponent` istifadə et.
  - UX: loading, error və empty state-lər yoxdur.

**3. (debugging)** "`react` yazıram, bəzən `re` nəticələri görünür."

- İstifadəçi: cleanup və ya React Query.
- Qiymət: qismən doğru. Həll düzgündür, amma səbəb izah olunmayıb. Səbəb: cavablar sırasız qayıdır, `setResults` ən son gələn cavabla çağırılır, ən son göndərilənlə yox.

## Result

- Bal: 1/3 · status learning · confidence low · növbəti təkrar 2026-11-01
- Misconceptions:
  - `href`-də istifadəçi URL-inin (`javascript:`) XSS riski görülmür.
  - Race condition-un səbəbi izah olunmur.
  - Comment severity + niyə formatında yazılmır.

## Mənbələr

- Mənbəsiz (stabil təcrübə).
- İstinad: Google Engineering Practices, Code Review, https://google.github.io/eng-practices/review/ (bu sessiyada oxunmayıb).
