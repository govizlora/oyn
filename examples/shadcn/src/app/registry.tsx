import * as OriginalDropdown from "@original/ui/dropdown-menu";
import * as CeramicDropdown from "@/ceramic/dropdown-menu";
import * as OriginalSelect from "@original/ui/select";
import * as CeramicSelect from "@/ceramic/select";
import { createElement, type ComponentProps, type ComponentType } from "react";
import { useAppearance } from "./appearance";
import * as OriginalButton from "@original/ui/button";
import * as CeramicButton from "@/ceramic/button";
import * as OriginalCard from "@original/ui/card";
import * as CeramicCard from "@/ceramic/card";
import * as OriginalDialog from "@original/ui/dialog";
import * as CeramicDialog from "@/ceramic/dialog";
import * as OriginalTabs from "@original/ui/tabs";
import * as CeramicTabs from "@/ceramic/tabs";

import { OriginalPanelSurface } from "./panel-surface";
import { PanelSurface as CeramicPanelSurface } from "@/ceramic/panel";

import { SidebarMenuButton as OriginalSidebarMenuButton } from "@original/ui/sidebar";
import { SidebarMenuButton as CeramicSidebarMenuButton } from "@/ceramic/sidebar";

const original = {
  DropdownMenuContent: OriginalDropdown.DropdownMenuContent,
  DropdownMenuItem: OriginalDropdown.DropdownMenuItem,
  DropdownMenuCheckboxItem: OriginalDropdown.DropdownMenuCheckboxItem,
  DropdownMenuRadioItem: OriginalDropdown.DropdownMenuRadioItem,
  DropdownMenuSubTrigger: OriginalDropdown.DropdownMenuSubTrigger,
  DropdownMenuSubContent: OriginalDropdown.DropdownMenuSubContent,

  SelectTrigger: OriginalSelect.SelectTrigger,
  SelectContent: OriginalSelect.SelectContent,
  SelectItem: OriginalSelect.SelectItem,

  SidebarMenuButton: OriginalSidebarMenuButton,
  PanelSurface: OriginalPanelSurface,
  Button: OriginalButton.Button,
  Card: OriginalCard.Card,
  CardHeader: OriginalCard.CardHeader,
  CardFooter: OriginalCard.CardFooter,
  CardTitle: OriginalCard.CardTitle,
  CardAction: OriginalCard.CardAction,
  CardDescription: OriginalCard.CardDescription,
  CardContent: OriginalCard.CardContent,
  Dialog: OriginalDialog.Dialog,
  DialogClose: OriginalDialog.DialogClose,
  DialogContent: OriginalDialog.DialogContent,
  DialogDescription: OriginalDialog.DialogDescription,
  DialogFooter: OriginalDialog.DialogFooter,
  DialogHeader: OriginalDialog.DialogHeader,
  DialogOverlay: OriginalDialog.DialogOverlay,
  DialogPortal: OriginalDialog.DialogPortal,
  DialogTitle: OriginalDialog.DialogTitle,
  DialogTrigger: OriginalDialog.DialogTrigger,
  Tabs: OriginalTabs.Tabs,
  TabsList: OriginalTabs.TabsList,
  TabsTrigger: OriginalTabs.TabsTrigger,
  TabsContent: OriginalTabs.TabsContent,
};
const ceramic: typeof original = {
  DropdownMenuContent: CeramicDropdown.DropdownMenuContent,
  DropdownMenuItem: CeramicDropdown.DropdownMenuItem,
  DropdownMenuCheckboxItem: CeramicDropdown.DropdownMenuCheckboxItem,
  DropdownMenuRadioItem: CeramicDropdown.DropdownMenuRadioItem,
  DropdownMenuSubTrigger: CeramicDropdown.DropdownMenuSubTrigger,
  DropdownMenuSubContent: CeramicDropdown.DropdownMenuSubContent,

  SelectTrigger: CeramicSelect.SelectTrigger,
  SelectContent: CeramicSelect.SelectContent,
  SelectItem: CeramicSelect.SelectItem,

  SidebarMenuButton: CeramicSidebarMenuButton,
  PanelSurface: CeramicPanelSurface,
  Button: CeramicButton.Button,
  Card: CeramicCard.Card,
  CardHeader: CeramicCard.CardHeader,
  CardFooter: CeramicCard.CardFooter,
  CardTitle: CeramicCard.CardTitle,
  CardAction: CeramicCard.CardAction,
  CardDescription: CeramicCard.CardDescription,
  CardContent: CeramicCard.CardContent,
  Dialog: CeramicDialog.Dialog,
  DialogClose: CeramicDialog.DialogClose,
  DialogContent: CeramicDialog.DialogContent,
  DialogDescription: CeramicDialog.DialogDescription,
  DialogFooter: CeramicDialog.DialogFooter,
  DialogHeader: CeramicDialog.DialogHeader,
  DialogOverlay: CeramicDialog.DialogOverlay,
  DialogPortal: CeramicDialog.DialogPortal,
  DialogTitle: CeramicDialog.DialogTitle,
  DialogTrigger: CeramicDialog.DialogTrigger,
  Tabs: CeramicTabs.Tabs,
  TabsList: CeramicTabs.TabsList,
  TabsTrigger: CeramicTabs.TabsTrigger,
  TabsContent: CeramicTabs.TabsContent,
};
export const componentRegistry = { original, ceramic };

/** App wiring only. The implementations do not know about the comparison mode. */
export function registered<K extends keyof typeof original>(name: K) {
  function Registered(props: ComponentProps<(typeof original)[K]>) {
    const { appearance } = useAppearance();
    const Component = componentRegistry[appearance][name] as ComponentType<object>;
    return createElement(Component, props as object);
  }
  Registered.displayName = `Registered(${name})`;
  return Registered;
}
