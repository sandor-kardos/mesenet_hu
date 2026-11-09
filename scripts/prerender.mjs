// Post-build prerender for SEO.
//
// The app is a client-rendered React SPA, so the raw HTML Googlebot first sees is an empty
// <div id="root">. This script runs after `vite build`, fetches the tales from the WordPress
// REST API and writes real HTML for the home page and for every /mese/<slug> page:
// unique <title>, description, canonical, Open Graph, JSON-LD, the full tale text and real
// <a href> internal links. React still mounts on top of it (createRoot replaces #root).
// It also regenerates dist/sitemap.xml from the same data.
//
// Env:
//   PRERENDER_API_FILE=path.json  read posts from a local JSON file instead of the API (tests)
//   PRERENDER_STRICT=1            fail the build if prerendering fails (default: warn, keep SPA)
//   KEEP_ZWJ=1                    keep the zero-width-joiner watermark in the static HTML
//                                 (default: stripped there, the React reader still has it)

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const SITE = 'https://mesenet.hu'
const API = 'https://api.mesenet.hu/wp-json/wp/v2/mese?_embed&per_page=100'
const STRICT = process.env.PRERENDER_STRICT === '1'
const KEEP_ZWJ = process.env.KEEP_ZWJ === '1'

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', rdquo: '”', ldquo: '“', rsquo: '’', lsquo: '‘', bdquo: '„' }

function decode(s = '') {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m)
}

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function fail(msg) {
  if (STRICT) {
    console.error(`[prerender] ERROR: ${msg}`)
    process.exit(1)
  }
  console.warn(`[prerender] WARNING: ${msg}. Keeping the plain SPA shell, no static SEO pages were written.`)
  process.exit(0)
}

function cleanContent(html) {
  let out = html
    .replace(/<div[^>]*id=['"]mese-focal-point['"][^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/—\s*\d+\s*—/g, '')
    .replace(/—/g, '–')
  if (!KEEP_ZWJ) out = out.replace(/\u200d/g, '')
  if (!out.includes('<p')) {
    out = out
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${p}</p>`)
      .join('\n')
  }
  return out.trim()
}

const plain = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

function snippet(text, max = 155) {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.!?\s]+$/, '') + '…'
}

function mapPost(post) {
  const acf = post.acf || {}
  const terms = post._embedded?.['wp:term']?.flat() || []
  const byTax = (t) => terms.filter((x) => x.taxonomy === t).map((x) => decode(x.name))
  const media = post._embedded?.['wp:featuredmedia']?.[0]
  const sizes = media?.media_details?.sizes || {}
  const content = cleanContent(post.content?.rendered || '')
  const text = plain(content)
  return {
    id: post.id,
    slug: post.slug,
    title: decode(post.title?.rendered || '').trim(),
    content,
    text,
    image: sizes.large?.source_url || media?.source_url || null,
    readingTime: parseInt(acf.reading_time, 10) || 5,
    ageGroup: byTax('age_group')[0] || null,
    collection: byTax('collection')[0] || null,
    questions: [acf.question_1, acf.question_2, acf.question_3].filter((q) => q && String(q).trim()),
    published: (post.date_gmt || post.date || '').slice(0, 10),
    modified: (post.modified_gmt || post.modified || post.date || '').slice(0, 10),
  }
}

function upsertMeta(html, attr, key, value) {
  const tag = `<meta ${attr}="${key}" content="${esc(value)}" />`
  const re = new RegExp(`<meta\\s+${attr}="${key.replace(/[:.]/g, '\\$&')}"\\s+content="[^"]*"\\s*/?>`, 'i')
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `    ${tag}\n  </head>`)
}

function buildHead(template, { title, description, url, image, type, jsonld }) {
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`)
  html = upsertMeta(html, 'name', 'description', description)
  html = upsertMeta(html, 'property', 'og:type', type)
  html = upsertMeta(html, 'property', 'og:url', url)
  html = upsertMeta(html, 'property', 'og:title', title)
  html = upsertMeta(html, 'property', 'og:description', description)
  html = upsertMeta(html, 'name', 'twitter:url', url)
  html = upsertMeta(html, 'name', 'twitter:title', title)
  html = upsertMeta(html, 'name', 'twitter:description', description)
  if (image) {
    html = upsertMeta(html, 'property', 'og:image', image)
    html = upsertMeta(html, 'name', 'twitter:image', image)
  }
  const extra =
    `    <link rel="canonical" href="${esc(url)}" />\n` +
    jsonld
      .map((o) => `    <script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>\n`)
      .join('')
  return html.replace('</head>', `${extra}  </head>`)
}

const withRoot = (html, inner) => html.replace('<div id="root"></div>', `<div id="root">${inner}</div>`)

function homeBody(stories) {
  const items = stories
    .map(
      (s) =>
        `<li><a href="/mese/${s.slug}">${esc(s.title)}</a>${s.ageGroup ? ` <small>(${esc(s.ageGroup)} éves kor)</small>` : ''}</li>`,
    )
    .join('\n')
  return (
    `<main><h1>Magyar népmesék és esti mesék gyerekeknek</h1>` +
    `<p>Ingyenes online meseolvasó gyerekeknek és szülőknek: klasszikus magyar népmesék, illusztrációk és beszélgetésindító kérdések minden estére.</p>` +
    `<h2>Összes mese</h2><ul>${items}</ul></main>`
  )
}

function taleBody(s, related) {
  const q = s.questions.length
    ? `<h2>Beszélgessünk a meséről</h2><ul>${s.questions.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
    : ''
  const rel = related.length
    ? `<h2>További mesék</h2><ul>${related.map((r) => `<li><a href="/mese/${r.slug}">${esc(r.title)}</a></li>`).join('')}</ul>`
    : ''
  const img = s.image ? `<img src="${esc(s.image)}" alt="${esc(s.title)} népmese illusztráció" />` : ''
  return (
    `<article><nav><a href="/">Mesenet.hu</a></nav>` +
    `<h1>${esc(s.title)}</h1>${img}` +
    `<p><small>Olvasási idő: kb. ${s.readingTime} perc${s.ageGroup ? ` · Korosztály: ${esc(s.ageGroup)} év` : ''}</small></p>` +
    `${s.content}${q}${rel}<p><a href="/">Vissza az összes meséhez</a></p></article>`
  )
}

async function loadPosts() {
  if (process.env.PRERENDER_API_FILE) {
    return JSON.parse(await readFile(process.env.PRERENDER_API_FILE, 'utf8'))
  }
  const res = await fetch(API, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`API answered HTTP ${res.status}`)
  return res.json()
}

async function main() {
  const indexPath = path.join(DIST, 'index.html')
  if (!existsSync(indexPath)) return fail('dist/index.html not found, run vite build first')

  // Pristine SPA shell for client-only routes (/discover, /log, /profile, /read/:id).
  // Written first on purpose: nginx falls back to /spa.html, so it must exist even if the
  // API is down and no tale pages can be generated.
  const shell = await readFile(indexPath, 'utf8')
  if (!shell.includes('<div id="root"></div>')) return fail('dist/index.html has no empty #root to fill (already prerendered?)')
  await writeFile(path.join(DIST, 'spa.html'), shell)

  let posts
  try {
    posts = await loadPosts()
  } catch (e) {
    return fail(`could not load tales (${e.message})`)
  }
  if (!Array.isArray(posts) || posts.length === 0) return fail('the API returned no tales')

  const stories = posts
    .map(mapPost)
    .filter((s) => /^[a-z0-9-]+$/.test(s.slug || '') && s.title && s.text.length > 200)
    .sort((a, b) => b.id - a.id)
  if (stories.length === 0) return fail('no tale passed the sanity checks (slug, title, text length)')

  // Home
  const homeTitle = 'Magyar népmesék gyerekeknek, ingyen online | Mesenet.hu'
  const homeDesc = `Ingyenes magyar népmesék és esti mesék gyerekeknek illusztrációkkal és beszélgetésindító kérdésekkel. ${stories.length} mese egy helyen.`
  const home = buildHead(shell, {
    title: homeTitle,
    description: homeDesc,
    url: `${SITE}/`,
    image: stories[0].image,
    type: 'website',
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Mesenet.hu', url: `${SITE}/`, inLanguage: 'hu' },
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: stories.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/mese/${s.slug}`, name: s.title })),
      },
    ],
  })
  await writeFile(indexPath, withRoot(home, homeBody(stories)))

  // Tales
  for (const [i, s] of stories.entries()) {
    const url = `${SITE}/mese/${s.slug}`
    const related = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => stories[(i + k) % stories.length]).filter((r) => r.slug !== s.slug)
    const description = snippet(`${s.title}: ${s.text}`)
    const title = `${s.title} - népmese gyerekeknek | Mesenet.hu`
    const page = buildHead(shell, {
      title,
      description,
      url,
      image: s.image,
      type: 'article',
      jsonld: [
        {
          '@context': 'https://schema.org',
          '@type': 'ShortStory',
          name: s.title,
          headline: s.title,
          inLanguage: 'hu',
          url,
          image: s.image || undefined,
          description,
          isAccessibleForFree: true,
          timeRequired: `PT${s.readingTime}M`,
          datePublished: s.published || undefined,
          dateModified: s.modified || undefined,
          author: { '@type': 'Person', name: s.collection || 'Magyar népmese' },
          publisher: { '@type': 'Organization', name: 'Mesenet.hu', url: SITE },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Mesenet.hu', item: `${SITE}/` },
            { '@type': 'ListItem', position: 2, name: s.title, item: url },
          ],
        },
      ],
    })
    const dir = path.join(DIST, 'mese', s.slug)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, 'index.html'), withRoot(page, taleBody(s, related)))
  }

  // Sitemap (home + tales; /discover is a thin client-only page, so it is left out)
  const newest = stories.map((s) => s.modified).sort().at(-1)
  const urls = [
    `  <url>\n    <loc>${SITE}/</loc>\n    <lastmod>${newest}</lastmod>\n  </url>`,
    ...stories.map((s) => `  <url>\n    <loc>${SITE}/mese/${s.slug}</loc>\n    <lastmod>${s.modified}</lastmod>\n  </url>`),
  ]
  await writeFile(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
  )

  console.log(`[prerender] OK: home + ${stories.length} tales + sitemap.xml written to dist/`)
}

main().catch((e) => fail(e.message))
