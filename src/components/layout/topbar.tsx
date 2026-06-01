"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { UserButton } from "@clerk/nextjs";
import { Moon, Sun, Plus, LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IS_LOCAL_AUTH } from "@/lib/dev-auth";
import { signOutLocal } from "@/app/actions/auth-local";

export function Topbar({ displayName }: { displayName?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <span className="text-xl">🦡</span>
        <span className="font-bold">Badger</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link href="/expenses?new=1">
            <Plus className="h-4 w-4" /> Add expense
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-5 w-5 dark:hidden" />
          <Moon className="hidden h-5 w-5 dark:block" />
        </Button>

        {IS_LOCAL_AUTH ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary"
                aria-label="Account menu"
              >
                {displayName ? displayName.charAt(0).toUpperCase() : "🦡"}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{displayName || "Your account"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/accounts">
                  <User className="h-4 w-4" /> Accounts
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={signOutLocal}>
                <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-destructive outline-none hover:bg-accent">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
        )}
      </div>
    </header>
  );
}
