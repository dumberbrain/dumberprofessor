---
title: Caching strategiyaları
type: lesson
domain: system-design
date: 2026-10-31
sources:
  - https://github.com/donnemartin/system-design-primer#cache
---

# Caching strategiyaları

**Məqsəd:** cache-aside, write-through, write-behind fərqini izah etmək; invalidation və cache stampede problemini həll etmək.
**Ön bilik:** HTTP request/response və DB sorğusu; latency anlayışı.

## İzah və mental model

Cache — yavaş mənbənin (DB, xarici API) qarşısında sürətli yaddaş (RAM). Məqsəd: təkrar oxunuşda latency və DB yükünü azaltmaq.

**Harada:** browser → CDN → reverse proxy (Varnish) → application cache (Redis/Memcached) → DB-nin öz buffer cache-i.

**Nəyi cache-ləmək:**
- *Query level* — sorğu hash-i key, nəticə value. Problem: bir sətir dəyişəndə onu ehtiva edən bütün sorğuları invalidate etmək lazımdır.
- *Object level* — `user:42` obyekti; data dəyişəndə həmin obyekt silinir. Daha idarəolunan, adətən seçilən budur.

**Nə vaxt yeniləmək:**

| Strategiya | Oxuma | Yazma | Əsas risk |
|---|---|---|---|
| **Cache-aside** (lazy) | App cache-ə baxır, miss → DB → cache-ə yazır | App DB-yə yazır, cache-i silir | Stale data, miss-də 3 round-trip |
| **Write-through** | Cache-dən | Cache-ə yazır → cache sinxron DB-yə | Yavaş yazma, oxunmayan data cache-i doldurur |
| **Write-behind** | Cache-dən | Cache-ə yazır → async DB-yə | Cache çöksə data itir |
| **Refresh-ahead** | Cache-dən | Populyar key-ləri TTL bitmədən yeniləyir | Səhv proqnoz → əlavə yük |

**Mental model:** cache-aside-da cache *məsləhətçidir* (həqiqət DB-dədir). Write-through/behind-də cache *qapıçıdır* (bütün yazılar ondan keçir); write-behind-də data DB-yə çatmamış yeganə nüsxə cache-dədir.

## Nümunə: cache-aside (Node + Redis)

```js
async function getUser(id) {
  const key = `user:${id}`;
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);                 // hit

  const user = await db.users.findById(id);        // miss → DB
  await redis.set(key, JSON.stringify(user), { EX: 300 }); // TTL 5 dəq
  return user;
}

async function updateUser(id, data) {
  await db.users.update(id, data);   // əvvəl source of truth
  await redis.del(`user:${id}`);     // sonra invalidate (update yox, delete)
}
```

## Detallar və edge case-lər

**1. Niyə update yox, delete?** İki writer: A DB-yə `v1`, B DB-yə `v2`, B cache-ə `v2`, A cache-ə `v1` → DB=`v2`, cache=`v1`, TTL bitənə qədər stale. `delete` ilə sıra fərq etmir — növbəti oxunuş DB-dən təzəsini çəkir. Kiçik race qalır (reader köhnə dəyəri oxuyur → writer update+del → reader köhnəni cache-ə yazır). Müdafiə: həmişə TTL (safety net), delayed double delete, və ya CDC (binlog → invalidation).

**2. Cache stampede (thundering herd).** Hot key expire olur → 1000 request eyni anda miss → hamısı DB-yə. Həll:
- **single-flight / lock**: `SET lock:key NX EX 10` — yalnız bir request DB-yə gedir, qalanları gözləyir və ya köhnə dəyəri alır;
- **stale-while-revalidate**: köhnə dəyəri qaytar, arxa planda yenilə;
- **probabilistic early refresh**: TTL bitməmiş təsadüfi yeniləmə.

**3. Cache avalanche.** Çox key eyni anda expire olur (hamısı deploy zamanı `EX 3600`) və ya Redis node çökür. Həll: TTL jitter (`3600 + random(0..300)`), replica, DB qarşısında circuit breaker / rate limit.

**4. Cache penetration.** Mövcud olmayan key-lər (`user:-1`) həmişə miss → DB. Həll: `null`-u qısa TTL ilə cache-lə, və ya Bloom filter.

**5. Eviction.** Yaddaş dolanda: **LRU** (ümumi hal), **LFU** (sabit hot set), TTL-based. Redis: `maxmemory-policy` (`allkeys-lru`, `allkeys-lfu`, `volatile-ttl`...).

### Trade-off-lar
- **Consistency ↔ latency**: uzun TTL = yüksək hit ratio, amma daha çox stale.
- **Write-through**: təzə oxuma, yavaş yazma. **Write-behind**: sürətli yazma, durability riski — pul/sifariş/balans üçün yox.
- Cache = əlavə infra: monitorinq, failover, cold start (yeni node boş).

### Tez-tez səhvlər
- TTL-siz cache → stale data əbədi.
- Yazmada `redis.set(newValue)` → race.
- **Təhlükəsizlik:** user-specific cavabı (`/me`, session) CDN/shared cache-də `Cache-Control: private` olmadan cache-ləmək → bir istifadəçinin datası digərinə göstərilir.
- Hit ratio, latency, eviction metriklərini izləməmək.
- Cache-i bilmədən source of truth etmək — flush olunanda data itir.
- File-based local cache → horizontal scaling çətinləşir.

## Quiz

**Tapşırıq.** E-commerce: məhsul qiyməti saatda 1–2 dəfə dəyişir, səhifə saniyədə 5000 dəfə oxunur. Hansı strategiya, təxminən hansı TTL, niyə?
- *Cavabın:* bilmirəm.
- *Düzgün cavab:* cache-aside + TTL 5–15 dəq + jitter, qiymət dəyişəndə `del`. Read-heavy → hit ratio çox yüksək; `del` stale-i dərhal aradan qaldırır, TTL yalnız safety net. Hot key → stampede qoruması (lock və ya stale-while-revalidate).

**1. (conceptual)** Bank balansı üçün write-behind niyə səhvdir? Hansı uyğundur?
- *Cavabın:* bilmirəm.
- *Düzgün cavab:* write-behind-də yazı cache-ə düşür, DB-yə async gedir; Redis çöksə pul əməliyyatı itir. Balans üçün durability vacibdir: DB-yə transaction ilə yaz, sonra cache `del` (cache-aside), və ya write-through (sinxron, yavaş, amma itki yox).

**2. (code-reading)** Nə edir, hansı risk var?
```js
async function getHot(key) {
  const v = await redis.get(key);
  if (v) return v;
  const ok = await redis.set(`lock:${key}`, '1', { NX: true });
  if (!ok) { await sleep(50); return getHot(key); }
  const fresh = await db.load(key);
  await redis.set(key, fresh, { EX: 600 });
  await redis.del(`lock:${key}`);
  return fresh;
}
```
- *Cavabın:* bilmirəm.
- *Düzgün cavab:* single-flight lock (stampede qoruması) — miss-də yalnız `NX` lock-u alan request DB-yə gedir, qalanları 50 ms gözləyib təkrar yoxlayır. Bug: lock-da TTL yoxdur — `db.load` zamanı proses çöksə və ya exception atsa `del` işləməz, hamı sonsuz retry-a düşür (deadlock). Fix: `{ NX: true, EX: 10 }`, `del`-i `try/finally`-də, retry sayına limit.

**3. (debugging)** Deploy-dan sonra hər saat başı DB CPU 10 saniyə 100% olur. Bütün key-lər `EX 3600` ilə yazılır. Səbəb və düzəliş?
- *Cavabın:* bilmirəm.
- *Düzgün cavab:* cache avalanche — key-lər deploy zamanı eyni anda eyni TTL ilə yazılıb, hamısı eyni anda expire olur, hamısı DB-yə gedir, yenə eyni TTL ilə yazılır → dövr hər saat təkrarlanır. Fix: TTL jitter (`EX: 3600 + Math.floor(Math.random() * 600)`); hot key-lər üçün lock / refresh-ahead.

## Nəticə

- **Bal:** 0/3 · status: learning · confidence low
- **Boşluqlar:** write-behind durability riski (pul datası); lock-da TTL olmaması deadlock yaradır; eyni TTL cache avalanche yaradır (jitter lazım)
- **Növbəti təkrar:** 2026-11-01

## Mənbələr

- [system-design-primer → Cache](https://github.com/donnemartin/system-design-primer#cache) — yerləşmə, strategiyalar, query/object level (tarix göstərilməyib; baxış 2026-10-31).
- Stampede, avalanche, penetration, double delete, Bloom filter — mənbəsiz (ümumi praktika).
