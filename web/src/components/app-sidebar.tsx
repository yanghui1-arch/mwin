"use client";

import * as React from "react";
import {
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconSearch,
  IconSettings,
  IconCirclePlusFilled,
  IconKey,
} from "@tabler/icons-react";

import { NavSecondary } from "@/components/nav/nav-secondary";
import { NavUser } from "@/components/nav/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavMain } from "./nav/nav-main";
import { useUser } from "./user-provider/use-user";
import { BotIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  const { t } = useTranslation();

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
      },
    ],
    navMain: [
      // {
      //   title: "Overview",
      //   url: "/overview",
      //   icon: IconCirclePlusFilled,
      //   label: "Dashboard",
      // },
      {
        title: t("siderbar.projects"),
        url: "/projects",
        icon: IconFolder,
        label: t("siderbar.observability"),
      },
      {
        title: t("siderbar.kubent"),
        url: "/kubent",
        icon: BotIcon,
        label: t("siderbar.optimizer"),
      },
      {
        title: t("siderbar.apiKey"),
        url: "/get_apikey",
        icon: IconKey,
        label: t("siderbar.manageApiKey"),
      },
    ],

    navSecondary: [
      {
        title: t("siderbar.settings"),
        url: "#",
        icon: IconSettings,
      },
      {
        title: t("siderbar.getHelp"),
        url: "#",
        icon: IconHelp,
      },
      {
        title: t("siderbar.search"),
        url: "#",
        icon: IconSearch,
      },
    ],
  };
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
                <span className="text-base font-semibold">{t("siderbar.title")}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            userName: user?.userName as string,
            avatar: user?.avatar as string,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
