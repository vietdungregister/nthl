export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'

export default function CmsIndexPage() {
    redirect('/cms/dashboard')
}
