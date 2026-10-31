"use client";

import type { CSSProperties } from "react";
import { XIcon } from "lucide-react";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";

/** The one right-hand drawer the counsellor's add and edit forms use */
export function SideDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      {/* Width via the drawer's own variable; a class would fight its default */}
      <DrawerContent style={{ "--drawer-content-width": "min(40rem, 100vw)" } as CSSProperties}>
        <div className="flex h-full min-h-0 w-full flex-col">
          <header className="flex items-start gap-4 border-b px-6 py-4">
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-lg font-semibold">{title}</DrawerTitle>
              {description && <DrawerDescription className="text-sm text-muted-foreground">{description}</DrawerDescription>}
            </div>
            <DrawerClose aria-label="Close" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <XIcon className="size-5" />
            </DrawerClose>
          </header>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export const inputClass =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30 aria-invalid:border-red-500";
