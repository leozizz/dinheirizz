export type ShowcaseTabId = 'dashboard' | 'pix' | 'ai' | 'transactions'

export interface ShowcaseFeature {
  id: ShowcaseTabId
  title: string
  subtitle: string
  badge: string
  description: string
  highlights: string[]
  iconName: string
}

export interface SecurityPillar {
  title: string
  description: string
  badge: string
  iconName: string
}
