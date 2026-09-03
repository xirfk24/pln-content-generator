// Compatibility layer: replaces next/link and next/navigation with react-router.
// Lets ported pages keep their original import surface.
import { Link as RouterLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import type { ComponentProps, ReactNode } from 'react'

export function Link({ href, children, ...rest }: { href: string; children: ReactNode } & Omit<ComponentProps<'a'>, 'href'>) {
  return (
    <RouterLink to={href} {...rest}>
      {children}
    </RouterLink>
  )
}

export default Link

export function useRouter() {
  const navigate = useNavigate()
  return {
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path, { replace: true }),
    refresh: () => navigate(0),
    back: () => navigate(-1),
  }
}

export function usePathname(): string {
  const location = useLocation()
  return location.pathname
}

export { useSearchParams }

export function redirect(path: string): never {
  window.location.assign(path)
  throw new Error('redirect')
}
