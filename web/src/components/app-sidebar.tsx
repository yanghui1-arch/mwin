"use client"

import * as React from "react"
import {
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconSearch,
  IconSettings,
  IconCirclePlusFilled,
  IconKey,
} from "@tabler/icons-react"

import { NavSecondary } from "@/components/nav/nav-secondary"
import { NavUser } from "@/components/nav/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavMain } from "./nav/nav-main"
import { useUser } from "./user-provider/use-user"
import { BotIcon } from "lucide-react"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "https://github.com/shadcn.png",
  },
  navDashboard: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconCirclePlusFilled,
    }
  ],
  navMain: [
    // {
    //   title: "Overview",
    //   url: "/overview",
    //   icon: IconCirclePlusFilled,
    //   label: "Dashboard",
    // },
    {
      title: "Projects",
      url: "/projects",
      icon: IconFolder,
      label: "Observability"
    },
    {
      title: "Kubent",
      url: "/kubent",
      icon: BotIcon,
      label: "Optimizer"
    },
    {
      title: "API key",
      url: "/apikey",
      icon: IconKey,
      label: "Manage API key"
    }
  ],

  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],

}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold">Optimizer</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain}/>
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{userName: user?.userName as string, avatar: user?.avatar as string}} />
      </SidebarFooter>
    </Sidebar>
  )
}
