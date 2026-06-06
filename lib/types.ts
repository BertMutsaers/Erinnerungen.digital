export type CardSize  = 'small' | 'medium' | 'large' | 'lg-black'
export type CardColor = 'schwarz' | 'gold' | 'rose' | 'weiss'

export interface Memory {
  id: string
  title?: string
  body?: string
  happenedAt?: string
  datumLabel?: string
  datumJahr: number
  datumMonat?: number
  datumTag?: number
  location?: string
  cardSize:  CardSize
  cardColor: CardColor
  imageUrl?: string
  icon?: string
  kategorie?: string
}

