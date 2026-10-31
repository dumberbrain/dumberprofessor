# Config Contract

> **Superseded by feature 002** (2026-10-31): configuration now lives in one hand-edited
> `config/professor.json` — see [002 data-model.md](../../002-professor-json-config/data-model.md)
> and [002 contracts/cli.md](../../002-professor-json-config/contracts/cli.md). The YAML files below are
> migrated automatically (`fp config migrate`) and kept in `config/legacy/`; this page documents
> the legacy format the migration reads.

Three human-edited YAML files under `config/`, validated by `fp sources check` and on every command
start. Field definitions: [data-model.md](../data-model.md).

## `config/sources.yml`

```yaml
sources:
  - id: react-blog
    name: React Blog
    type: rss
    url: https://react.dev/rss.xml
    tier: 1
    domains: [frontend]
    purpose: Official React releases and RFC outcomes
    updateFrequency: weekly
    reliability: primary, authoritative
    limitations: no patch-release posts
    failureBehavior: mark unavailable, continue
  - id: yt-jherr
    name: Jack Herrington
    type: youtube
    url: https://www.youtube.com/@jherr
    channelId: null            # filled by `fp sources resolve`
    tier: 4
    domains: [frontend]
    purpose: In-depth React/Next.js and tooling explanations
    updateFrequency: weekly
    reliability: experienced practitioner; opinions separated from facts
    limitations: transcript depends on yt-dlp and available captions
    failureBehavior: mark not analyzed, continue
  - id: npm-advisories
    name: GitHub Advisory Database (npm)
    type: github-advisories
    url: https://api.github.com/advisories
    tier: 1
    domains: [security, frontend]
    params: { ecosystem: npm, severity: [high, critical] }
    purpose: Vulnerabilities in the npm ecosystem
    updateFrequency: continuous
    reliability: primary, curated
    limitations: 60 requests/hour without token
    failureBehavior: mark unavailable, continue
```

Initial file ships with every source in the spec's Assumptions, including all ten YouTube
channels: `@d.zhiganov`, `@javascriptmastery`, `@hayk.simonyan`, `@Codevolution`,
`@PurpleSchool`, `@therealseniordev`, `@tapasadhikary`, `@codewithantonio`, `@jherr`,
`@developerwaypatterns`. Feed URLs for RSS sources are confirmed by `fp sources check` before
first use; a source that fails the check stays listed but disabled with the error noted.

## `config/interests.yml`

```yaml
priorityTechnologies: [React, Next.js, TypeScript, JavaScript, CSS, Browser platform,
  Web performance, System design, Web security, LLM models]
ignoredTopics: []
updatedAt: 2026-10-29
```

## `config/settings.yml`

```yaml
schedule:
  enabled: false        # set true only by `fp schedule enable`
  generationTime: "08:00"
  timeZone: Asia/Baku   # defaults to the system time zone when omitted
```
