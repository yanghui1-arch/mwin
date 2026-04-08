import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Pipeline } from "../types"
import { IdentifierBadge } from "./identifier-badge"

export type CreatePromptForm = {
  pipelineId: string
  name: string
  version: string
  content: string
}

interface CreatePromptDialogProps {
  open: boolean
  loading: boolean
  copied: boolean
  error: string | null
  createdIdentifier: string | null
  form: CreatePromptForm
  pipelines: Pipeline[]
  canCreate: boolean
  onOpenChange: (open: boolean) => void
  onFormChange: (form: CreatePromptForm) => void
  onCreate: () => void
  onCopyCreatedIdentifier: () => void
}

export function CreatePromptDialog({
  open,
  loading,
  copied,
  error,
  createdIdentifier,
  form,
  pipelines,
  canCreate,
  onOpenChange,
  onFormChange,
  onCreate,
  onCopyCreatedIdentifier,
}: CreatePromptDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl min-h-[430px]">
        {createdIdentifier ? (
          <div className="flex min-h-[360px] items-center justify-center">
            <IdentifierBadge
              identifier={createdIdentifier}
              copied={copied}
              onCopy={onCopyCreatedIdentifier}
            />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("prompts.createPrompt.title")}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-prompt-name">{t("prompts.createPrompt.name")}</Label>
                <Input
                  id="create-prompt-name"
                  value={form.name}
                  onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                  placeholder={t("prompts.createPrompt.namePlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-prompt-version">{t("prompts.createPrompt.version")}</Label>
                <Input
                  id="create-prompt-version"
                  value={form.version}
                  onChange={(e) => onFormChange({ ...form, version: e.target.value })}
                  placeholder={t("prompts.createPrompt.versionPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("prompts.createPrompt.pipeline")}</Label>
                <Select
                  value={form.pipelineId}
                  onValueChange={(value) => onFormChange({ ...form, pipelineId: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t("prompts.createPrompt.pipelinePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-prompt-content">{t("prompts.createPrompt.content")}</Label>
                <Textarea
                  id="create-prompt-content"
                  value={form.content}
                  onChange={(e) => onFormChange({ ...form, content: e.target.value })}
                  placeholder={t("prompts.createPrompt.contentPlaceholder")}
                  className="min-h-[150px] resize-y"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {t("prompts.createPrompt.cancel")}
              </Button>
              <Button
                type="button"
                onClick={onCreate}
                disabled={loading || !canCreate}
              >
                {t("prompts.createPrompt.create")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
