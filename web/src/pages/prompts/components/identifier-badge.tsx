import { Check, Copy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface IdentifierBadgeProps {
  identifier: string
  copied: boolean
  onCopy: () => void
}

export function IdentifierBadge({ identifier, copied, onCopy }: IdentifierBadgeProps) {
  return (
    <Badge
      variant="outline"
      className="inline-flex h-9 max-w-[360px] min-w-0 shrink-0 items-center justify-center rounded-full px-3 bg-white/80 border-border/70 text-foreground gap-2"
    >
      <span className="font-mono text-xs truncate max-w-[300px]">{identifier}</span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-6 rounded-full hover:bg-muted"
        onClick={onCopy}
      >
        {copied
          ? <Check className="size-3.5 text-emerald-600" />
          : <Copy className="size-3.5" />
        }
      </Button>
    </Badge>
  )
}
