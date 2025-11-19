"use client";
import { Banner, BannerClose, BannerIcon } from "@/components/ui/shadcn-io/banner";
import { CircleAlert, Info, Github, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type BannerVariant = "default" | "important" | "notification" | "github";

interface SystemNotificationBannerProps {
  children: React.ReactNode;
  variant?: BannerVariant;
  canClose?: boolean;
}

const variantConfig: Record<BannerVariant, { icon: LucideIcon; className: string }> = {
  default: {
    icon: Info,
    className: "bg-muted text-muted-foreground border-b border-border [&_button]:hover:bg-background/50",
  },
  important: {
    icon: CircleAlert,
    className: "bg-[var(--banner-important)] text-[var(--banner-important-foreground)] border-b border-[var(--banner-important-border)] [&_button]:hover:bg-black/10 dark:[&_button]:hover:bg-white/10",
  },
  notification: {
    icon: Info,
    className: "bg-[var(--banner-notification)] text-[var(--banner-notification-foreground)] border-b border-[var(--banner-notification-border)] [&_button]:hover:bg-black/10 dark:[&_button]:hover:bg-white/10",
  },
  github: {
    icon: Github,
    className: "bg-card text-card-foreground border-b border-border [&_button]:hover:bg-muted",
  },
};

const SystemNotificationBanner = ({
  children,
  variant = "default",
  canClose = true,
}: SystemNotificationBannerProps) => {
  const config = variantConfig[variant];
  
  return (
    <Banner className={cn(config.className)}>
      <BannerIcon icon={config.icon} />
      {children}
      {canClose && <BannerClose />}
    </Banner>
  );
};

export default SystemNotificationBanner;
