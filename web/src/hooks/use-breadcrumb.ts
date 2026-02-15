import { useLocation, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

export interface BreadcrumbItem {
  label: string
  href?: string
  isCurrentPage: boolean
}

export function useBreadcrumb(): BreadcrumbItem[] {
  const location = useLocation()
  const params = useParams()
  const { t } = useTranslation()

  const pathSegments = location.pathname.split("/").filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  // Always add home as the first breadcrumb
  breadcrumbs.push({
    label: t("breadcrumb.home"),
    href: "/overview",
    isCurrentPage: false,
  })

  // Build breadcrumbs based on path segments
  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i]
    const isLast = i === pathSegments.length - 1
    const path = "/" + pathSegments.slice(0, i + 1).join("/")

    switch (segment) {
      case "overview":
        breadcrumbs.push({
          label: t("breadcrumb.overview"),
          href: isLast ? undefined : path,
          isCurrentPage: isLast,
        })
        break
      case "projects":
        breadcrumbs.push({
          label: t("breadcrumb.projects"),
          href: isLast ? undefined : "/projects",
          isCurrentPage: isLast,
        })
        break
      case "kubent":
        breadcrumbs.push({
          label: t("breadcrumb.kubent"),
          href: isLast ? undefined : path,
          isCurrentPage: isLast,
        })
        break
      case "get_apikey":
        breadcrumbs.push({
          label: t("breadcrumb.apiKey"),
          href: isLast ? undefined : path,
          isCurrentPage: isLast,
        })
        break
      default:
        // Handle dynamic segments like project names
        if (params.name && segment === params.name) {
          breadcrumbs.push({
            label: params.name,
            href: isLast ? undefined : path,
            isCurrentPage: isLast,
          })
        }
        break
    }
  }

  return breadcrumbs
}
