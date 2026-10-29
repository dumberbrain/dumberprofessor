import type { Addendum, Claim, DailyReport, NewsItem } from '../schemas/report.js';

const CATEGORY_AZ: Record<NewsItem['category'], string> = {
  breaking: 'Təcili inkişaf',
  release: 'Rəsmi buraxılış / elan',
  'ecosystem-change': 'Ekosistem dəyişikliyi',
  'security-advisory': 'Təhlükəsizlik xəbərdarlığı',
  research: 'Tədqiqat / eksperimental',
  'community-opinion': 'İcma müzakirəsi / rəy',
  update: 'Əvvəl xəbər verilmiş inkişafa yenilənmə',
};

const CLAIM_BADGE: Record<Claim['status'], string> = {
  verified: '✅ təsdiqlənib',
  unverified: '⚠️ təsdiqlənməyib',
  'vendor-reported': '🏷 istehsalçının iddiası',
};

const fmtTime = (t: number) => {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

const date = (iso: string | null) => (iso ? iso.slice(0, 10) : 'nəşr tarixi məlum deyil');

function list(title: string, items: string[]): string[] {
  return items.length ? [`**${title}:**`, ...items.map((x) => `- ${x}`), ''] : [];
}

export function renderItem(item: NewsItem, heading = '###'): string {
  const lines = [
    `${heading} ${item.rank}. ${item.title}`,
    '',
    `*${CATEGORY_AZ[item.category]}* · ${item.domains.join(', ')} · ${item.technologies.join(', ')}`,
    '',
    item.summaryAz,
    '',
    `**Niyə vacibdir:** ${item.whyItMattersAz}`,
    '',
    `**Mühəndis üçün nəticə:** ${item.implicationsAz}`,
    '',
    ...list('Faktlar', item.facts),
    ...list('Şərh', item.interpretation),
    ...list('Proqnozlar', item.predictions),
  ];
  if (item.claims.length) {
    lines.push('**Yoxlanılan iddialar:**');
    for (const c of item.claims) {
      const evidence = c.evidenceUrl ? ` — [mənbə](${c.evidenceUrl})` : '';
      const reason = c.reason ? ` — ${c.reason}` : '';
      lines.push(`- ${CLAIM_BADGE[c.status]}: ${c.text}${evidence}${reason}`);
    }
    lines.push('');
  }
  if (item.video) {
    if (item.video.notAnalyzed) {
      lines.push('🎥 *Video təhlil olunmayıb: transcript əlçatan deyildi. Yalnız başlıq və təsvir əsasında.*', '');
    } else if (item.video.keyPoints.length) {
      lines.push('**Videonun əsas məqamları:**');
      for (const k of item.video.keyPoints) lines.push(`- [${fmtTime(k.t)}](${item.primarySource.url}&t=${k.t}s) ${k.textAz}`);
      lines.push('');
    }
  }
  if (item.updateOf) lines.push(`↩️ Əvvəlki xəbər: \`${item.updateOf}\``, '');
  const supporting = (item.supportingSources ?? []).map((s) => `[${s.name}](${s.url}) (Tier ${s.tier}${s.role ? `, ${s.role}` : ''})`);
  lines.push(
    `**Mənbə:** [${item.primarySource.name}](${item.primarySource.url}) (Tier ${item.primarySource.tier}) · ` +
      `nəşr: ${date(item.publishedAt)} · aşkar edilib: ${item.discoveredAt.slice(0, 10)}`,
  );
  if (supporting.length) lines.push(`**Əlavə mənbələr:** ${supporting.join(', ')}`);
  return lines.join('\n');
}

export function renderReport(report: DailyReport, addenda: Addendum[] = []): string {
  const out = [
    `# Gündəlik hesabat — ${report.reportDate}`,
    '',
    `Əhatə olunan dövr: ${report.coveredPeriod.start} → ${report.coveredPeriod.end}` +
      (report.catchUp ? ' · **catch-up hesabatı** (əvvəlki hesabatdan bəri)' : ''),
    '',
    '## Xülasə',
    '',
    report.executiveSummaryAz,
    '',
  ];
  if (report.fewItemsNote) out.push(`> ${report.fewItemsNote}`, '');
  out.push('## Xəbərlər', '');
  for (const item of report.items) out.push(renderItem(item), '');

  if (report.followUps.length) {
    out.push('## İzlənilən mövzular', '');
    for (const f of report.followUps) out.push(`- \`${f.originItemId}\`: ${f.reasonAz}`);
    out.push('');
  }
  if (report.recommendationsAz.length) {
    out.push('## Tövsiyələr', '');
    for (const r of report.recommendationsAz) {
      const kind = r.kind === 'reading' ? '📖' : '🧪';
      out.push(`- ${kind} ${r.url ? `[${r.title}](${r.url})` : r.title}`);
    }
    out.push('');
  }
  out.push('## Bilik yoxlaması', '', report.knowledgeCheck.questionAz, '');
  if (report.unavailableSources.length) {
    out.push(`*Əlçatan olmayan mənbələr:* ${report.unavailableSources.join(', ')}`, '');
  }
  const q = report.quality;
  out.push(
    `<sub>Keyfiyyət: ${q.itemCount} xəbər · təsdiq payı ${Math.round(q.verifiedShare * 100)}% · ` +
      `${q.duplicatesRemoved} dublikat · ${q.droppedAsOld} köhnə · ${q.vendorReportedCount} vendor-reported · ` +
      `${q.notAnalyzedVideos} təhlil olunmamış video</sub>`,
    '',
  );
  addenda.forEach((a, n) => {
    out.push(`## Gec əlavələr #${n + 1} (${a.addedAt})`, '');
    for (const item of a.items) out.push(renderItem(item), '');
  });
  return out.join('\n');
}
