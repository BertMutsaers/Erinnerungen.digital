export type CardSize  = 'small' | 'medium' | 'large' | 'lg-black'
export type CardColor = 'schwarz' | 'gold' | 'rose' | 'blau' | 'weiss' | 'gruen'

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
  cardSize:    CardSize
  cardColor?:  CardColor   // optional: if set in DB, used directly; else computed by planGridLayout
  pinnedSize?:     CardSize  // raw DB card_size value
  groesseManuell?: boolean  // true = user set this size intentionally in EditSheet
  bodyExtra?:      string   // KI-generated zeitgeschehen context
  bookId?:         string   // parent project/book id
  imageUrl?: string
  icon?: string
  kategorie?: string
}
