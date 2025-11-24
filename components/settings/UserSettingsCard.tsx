"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { settingsStorage } from "@/lib/utils/settings-storage";
import type { UserSettings } from "@/lib/schema/settings.schema";
import { Switch } from "@/components/ui/switch";

export function UserSettingsCard() {
  const [settings, setSettings] = React.useState<UserSettings | null>(null);

  React.useEffect(() => {
    setSettings(settingsStorage.load());
  }, []);

  const handleToggle = (key: keyof UserSettings, value: boolean) => {
    if (!settings) return;

    const updated = { ...settings, [key]: value };
    setSettings(updated);
    settingsStorage.save(updated);
  };

  if (!settings) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Settings</CardTitle>
        <CardDescription>
          Configure your inbox behavior and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">


        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5 flex-1">
            <Label htmlFor="polling-enabled" className="text-base font-medium">
              Background Polling
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically check for new items in the background every 10
              seconds
            </p>
          </div>
          <Switch
            id="polling-enabled"
            checked={settings.pollingEnabled}
            onCheckedChange={(checked) =>
              handleToggle("pollingEnabled", checked)
            }
          />
        </div>

        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5 flex-1">
            <Label htmlFor="auto-refresh" className="text-base font-medium">
              Auto-Refresh UI
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically update the UI when new items are found. If disabled,
              you'll see a "new" badge instead and can manually refresh.
            </p>
          </div>
          <Switch
            id="auto-refresh"
            checked={settings.autoRefreshOnPoll}
            onCheckedChange={(checked) =>
              handleToggle("autoRefreshOnPoll", checked)
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
