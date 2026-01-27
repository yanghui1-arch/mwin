import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Languages } from "lucide-react"
import { useTranslation } from "react-i18next"

const languageOptions = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
]

function normalizeLanguage(value?: string) {
  if (!value) return "zh"
  if (value.startsWith("en")) return "en"
  return "zh"
}

export function SiteHeader() {
  const { i18n } = useTranslation()
  const currentLang = normalizeLanguage(i18n.language)

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value)
    localStorage.setItem("lang", value)
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">Temporary space in site-header.tsx</h1>
        <div className="ml-auto flex items-center gap-2">
          <Select value={currentLang} onValueChange={handleLanguageChange}>
            <SelectTrigger size="sm" className="hidden sm:flex">
              <Languages className="size-4" />
              <SelectValue className="sr-only" />
            </SelectTrigger>
            <SelectContent align="end">
              {languageOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a
              href="https://github.com/yanghui1-arch/Mwin"
              rel="noopener noreferrer"
              target="_blank"
              className="dark:text-foreground"
            >
              GitHub
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
