/**
 * huggingface.ts
 *
 * HuggingFace Hub lookups for entries that ship as model weights, datasets or
 * collections instead of a GitHub repository. Used by add-tool.ts and update-stars.ts.
 */

const HF_URL_RE = /^https?:\/\/huggingface\.co\/(datasets\/|collections\/)?([^/\s]+)\/([^/?#\s]+)/

type HfKind = 'models' | 'datasets' | 'collections'

export interface HfRef {
  kind: HfKind
  owner: string
  name: string
  url: string
}

export interface HfInfo {
  name: string
  description: string
  license: string
  likes: number
  downloads: number
  lastModified: string
  tags: string[]
}

export function parseHuggingFaceUrl(url: string): HfRef | null {
  const match = url.trim().match(HF_URL_RE)
  if (!match) return null
  const [, prefix, owner, name] = match
  const kind: HfKind = prefix === 'datasets/' ? 'datasets' : prefix === 'collections/' ? 'collections' : 'models'
  return { kind, owner, name, url: `https://huggingface.co/${prefix ?? ''}${owner}/${name}` }
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HuggingFace API ${res.status} for ${url}`)
  return res.json()
}

function cardLicense(data: any): string {
  const card = data.cardData ?? {}
  return card.license === 'other' && card.license_name ? card.license_name : card.license ?? 'Unknown'
}

function latest(dates: Array<string | undefined>): string {
  const valid = dates.filter((d): d is string => !!d).sort()
  return valid[valid.length - 1] ?? new Date().toISOString()
}

export async function fetchHuggingFace(ref: HfRef): Promise<HfInfo> {
  const data = await getJson(`https://huggingface.co/api/${ref.kind}/${ref.owner}/${ref.name}`)

  if (ref.kind === 'collections') {
    // A collection has no likes of its own worth comparing; sum its items instead.
    const items: any[] = data.items ?? []
    // Collections carry no license; use the first model's card as the representative one.
    const firstModel = items.find((i) => i.type === 'model')
    const license = firstModel
      ? cardLicense(await getJson(`https://huggingface.co/api/models/${firstModel.id}`))
      : 'Unknown'
    return {
      name: data.title ?? ref.name,
      description: data.description ?? '',
      license,
      likes: items.reduce((sum, i) => sum + (i.likes ?? 0), 0),
      downloads: items.reduce((sum, i) => sum + (i.downloads ?? 0), 0),
      lastModified: latest([data.lastUpdated, ...items.map((i) => i.lastModified)]),
      tags: [],
    }
  }

  return {
    name: ref.name,
    description: '',
    license: cardLicense(data),
    likes: data.likes ?? 0,
    downloads: data.downloads ?? 0,
    lastModified: data.lastModified ?? new Date().toISOString(),
    tags: [data.pipeline_tag, data.library_name].filter((t): t is string => !!t),
  }
}
