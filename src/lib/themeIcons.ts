import type { ResolvedTheme } from '../types/theme'

interface ThemeIconDefinition {
  rel: 'icon' | 'apple-touch-icon'
  file: string
  selector: string
  sizes?: string
  type?: string
}

const THEME_ICON_DEFINITIONS: readonly ThemeIconDefinition[] = [
  {
    rel: 'icon',
    file: 'favicon.ico',
    selector: 'link[rel="icon"]:not([sizes])'
  },
  {
    rel: 'icon',
    file: 'favicon-16x16.png',
    selector: 'link[rel="icon"][sizes="16x16"]',
    sizes: '16x16',
    type: 'image/png'
  },
  {
    rel: 'icon',
    file: 'favicon-32x32.png',
    selector: 'link[rel="icon"][sizes="32x32"]',
    sizes: '32x32',
    type: 'image/png'
  },
  {
    rel: 'apple-touch-icon',
    file: 'apple-touch-icon.png',
    selector: 'link[rel="apple-touch-icon"]',
    sizes: '180x180'
  }
]

/**
 * Sincroniza os <link> de favicon e apple-touch-icon no document.head
 * com o tema ativo, removendo o atributo media para garantir precedência manual.
 */
export const syncThemeIconsToDOM = (resolved: ResolvedTheme): void => {
  if (typeof document === 'undefined' || !document.head) {
    return
  }

  const basePath = `/dinheirizz-${resolved}`

  THEME_ICON_DEFINITIONS.forEach((definition) => {
    const href = `${basePath}/${definition.file}`
    const existingLinks = Array.from(document.head.querySelectorAll(definition.selector))

    if (existingLinks.length === 0) {
      const link = document.createElement('link')
      link.setAttribute('rel', definition.rel)
      if (definition.type) {
        link.setAttribute('type', definition.type)
      }
      if (definition.sizes) {
        link.setAttribute('sizes', definition.sizes)
      }
      link.setAttribute('href', href)
      document.head.appendChild(link)
      return
    }

    const [primaryLink, ...duplicateLinks] = existingLinks
    primaryLink.setAttribute('href', href)
    primaryLink.removeAttribute('media')
    if (definition.type) {
      primaryLink.setAttribute('type', definition.type)
    }
    if (definition.sizes) {
      primaryLink.setAttribute('sizes', definition.sizes)
    }

    duplicateLinks.forEach((duplicate) => duplicate.remove())
  })
}
