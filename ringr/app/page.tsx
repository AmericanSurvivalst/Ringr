import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to login page - landing page is served from /public/landing.html
  redirect('/login')
}
