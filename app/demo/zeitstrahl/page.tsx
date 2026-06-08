import { redirect } from 'next/navigation'

// /demo/zeitstrahl → /demo (canonical demo URL)
export default function DemoZeitstrahlRedirect() {
  redirect('/demo')
}
