import { useId, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@ui-sdk/react/avatar";

export function Example() {
  const [open, setOpen] = useState(false);
  const profile = useId();
  return (
    <div className="avatar-profile">
      <Avatar
        render={
          <button
            type="button"
            aria-label="Profile for shadcn"
            aria-expanded={open}
            aria-controls={profile}
            onClick={() => setOpen(!open)}
          />
        }
      >
        <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <div id={profile} hidden={!open}>
        <strong>shadcn</strong>
        <a href="https://github.com/shadcn">GitHub profile</a>
      </div>
    </div>
  );
}
