---
title: XSS basics
type: lesson
domain: security
date: 2026-10-30
sources:
  - https://owasp.org/www-community/attacks/xss/
---

# XSS basics

Cross-site scripting şərt yaradır: istifadəçi mətni HTML kimi işlənir.

## Nümunə

```ts
const html = `<p>${userInput}</p>`; // təhlükəli
```

## Cədvəl

| Kontekst | Escape |
| -------- | ------ |
| HTML     | `&lt;` |
| URL      | `encodeURIComponent` |

## Davamı

Növbəti dərs: [CSP](../research/2026-10-31-csp.md). Ətraflı: [OWASP](https://owasp.org/).
