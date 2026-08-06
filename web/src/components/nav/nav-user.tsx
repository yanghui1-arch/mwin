import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconNotification,
  IconUserCircle,
} from "@tabler/icons-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { MWIN_JWT } from "@/types/storage-const"
import { useTranslation } from "react-i18next"
import { Skeleton } from "@/components/ui/skeleton"
import { useState } from "react"

function UserAvatar({ userName, avatar }: { userName: string; avatar: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle")
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?"

  return (
    <Avatar className="size-8 rounded-lg">
      <AvatarImage
        src={avatar}
        alt={userName}
        onLoadingStatusChange={setStatus}
      />
      <AvatarFallback className="rounded-lg">
        {status === "idle" || status === "loading" ? (
          <Skeleton className="size-full" />
        ) : (
          initials
        )}
      </AvatarFallback>
    </Avatar>
  )
}

export function NavUser({
  user,
  isLoading = false,
}: {
  user: {
    userName: string
    avatar: string
    email?: string
  }
  isLoading?: boolean
}) {
  const { isMobile } = useSidebar()
  const { t } = useTranslation()

  const logOut = () => {
    localStorage.removeItem(MWIN_JWT);
    window.location.href = "/login";
  }

  if (isLoading) {
    return (
      <SidebarMenu aria-busy="true">
        <SidebarMenuItem>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserAvatar userName={user.userName} avatar={user.avatar} />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.userName}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <UserAvatar userName={user.userName} avatar={user.avatar} />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.userName}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <IconUserCircle />
                {t("navUser.account")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconCreditCard />
                {t("navUser.billing")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconNotification />
                {t("navUser.notifications")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logOut}>
              <IconLogout />
              {t("navUser.logOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
