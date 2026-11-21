"use client";

import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@oyn/ui/menu";
import { useLog } from "../../log";

function Example() {
  const log = useLog();

  return (
    <Menu onAction={(value) => log(`Chose ${value}`)}>
      <MenuTrigger>Open Menu</MenuTrigger>
      <MenuContent>
        <MenuGroup>
          <MenuGroupLabel>Project</MenuGroupLabel>
          <MenuItem value="overview">Overview</MenuItem>
          <MenuItem value="members">Members</MenuItem>
          <MenuItem value="settings">Settings</MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>Help</MenuGroupLabel>
          <MenuItem value="docs">Documentation</MenuItem>
          <MenuItem value="feedback">Send feedback</MenuItem>
        </MenuGroup>
      </MenuContent>
    </Menu>
  );
}

export { Example };
