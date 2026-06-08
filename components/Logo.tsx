import Image from 'next/image'

type Variant = 'full' | 'text' | 'symbol'

interface Props {
  variant?:  Variant
  height?:   number
  className?: string
}

const SRC: Record<Variant, string> = {
  full:   '/logo-full.svg',
  text:   '/logo-text.svg',
  symbol: '/logo-symbol.svg',
}

const ALT: Record<Variant, string> = {
  full:   'erinnerungen.digital',
  text:   'erinnerungen.digital',
  symbol: 'erinnerungen.digital Logo',
}

export default function Logo({ variant = 'full', height = 40, className }: Props) {
  return (
    <Image
      src={SRC[variant]}
      alt={ALT[variant]}
      height={height}
      width={0}
      className={className}
      style={{ width: 'auto', height }}
      priority
    />
  )
}
