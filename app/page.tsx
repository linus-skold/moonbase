"use client";
import { useEffect, useState, useMemo } from "react";

import {
  InboxContainer,
  InboxContent,
  InboxFooter,
  InboxHeader,
  InboxRow,
} from "@/components/inbox/inbox-view";
import {
  ArrowDownAZ,
  CalendarArrowDown,
  CalendarArrowUp,
  ListFilter,
  Inbox,
  ArrowUpDown,
  ArrowDownZA,
  Mail,
  GitPullRequest,
  ListTodo,
  Rocket,
  RefreshCw,
  MoreVertical,
  Network,
} from "lucide-react";
import { InboxSearch } from "@/components/search/InboxSearch";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { DateTime } from "luxon";
import { ProgressContainer } from "@/components/progress-card/ProgressContainer";
import { NotificationPopupContainer } from "@/components/notification-popup/NotificationPopupContainer";
import { useBroker } from "@/lib/broker";
import { ProjectCardComponent } from "@/components/project-group/ProjectGroup";
import { InboxItemCard } from "@/components/InboxItemCard";
import type {
  SearchSuggestion,
  SuggestionType,
} from "@/lib/schema/suggestion.schema";
import { processTypedItems } from "@/lib/utils/inbox-filters";
import type { SortOption, FilterOption } from "@/lib/utils/inbox-filters";

export default function Page() {
  const broker = useBroker();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | string>("-");
  const [, forceUpdate] = useState(0);
  
  // Progress tracking
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Loading items...");
  
  // New items notification
  const [showNewItemsNotification, setShowNewItemsNotification] = useState(false);
  const [hasNewItems, setHasNewItems] = useState(false);

  const sortOptions = [
    { label: "A-Z", value: "title-asc", icon: ArrowDownAZ },
    { label: "Z-A", value: "title-desc", icon: ArrowDownZA },
    { label: "Latest", value: "date-desc", icon: CalendarArrowDown },
    { label: "Oldest", value: "date-asc", icon: CalendarArrowUp },
    { label: "Source A-Z", value: "source-asc", icon: Network },
    { label: "Source Z-A", value: "source-desc", icon: Network },
  ];

  const filterOptions = [
    { label: "All", value: "all", icon: Mail },
    { label: "Pull Requests", value: "pullRequest", icon: GitPullRequest },
    { label: "Issues", value: "workItem", icon: ListTodo },
    { label: "Pipelines", value: "pipeline", icon: Rocket },
  ];

  // Generate search suggestions from items
  const searchSuggestions = useMemo(() => {
    const counts = new Map<SuggestionType, Map<string, number>>();
    const types: SuggestionType[] = [
      "project",
      "org",
      "repo",
      "status",
      "assignee",
      "type",
    ];

    // Initialize count maps
    types.forEach((type) => counts.set(type, new Map()));

    // Count occurrences for this specific instance
    items.forEach((item: any) => {
      const incrementCount = (
        type: SuggestionType,
        value: string | undefined
      ) => {
        if (!value) return;
        const map = counts.get(type)!;
        map.set(value, (map.get(value) || 0) + 1);
      };

      incrementCount("project", item.project?.name);
      incrementCount("org", item.instance?.name);
      incrementCount("repo", item.repository?.name);
      incrementCount("status", item.status);
      incrementCount("assignee", item.assignedTo?.displayName);
      incrementCount("type", item.type);
    });

    // Convert to suggestions
    const suggestions: SearchSuggestion[] = [];
    counts.forEach((map, type) => {
      map.forEach((count, name) => {
        suggestions.push({ type, value: name, label: name, count });
      });
    });

    return suggestions;
  }, [items]);

  // Load cached data immediately on mount
  useEffect(() => {
    const loadCachedData = () => {
      const exchanges = broker.getAllExchanges();
      const cachedItems = exchanges.flatMap((exchange) => [
        ...exchange.getWorkItems(),
        ...exchange.getPullRequests(),
        ...exchange.getPipelines(),
      ]);
      
      if (cachedItems.length > 0) {
        setItems(cachedItems);
        setLoading(false);
      }
    };
    
    loadCachedData();
  }, [broker]);
  
  // Fetch fresh data in background on mount
  useEffect(() => {
    const fetchFreshData = async () => {
      try {
        const exchanges = broker.getAllExchanges();
        setProgressTotal(exchanges.length);
        setProgressCurrent(0);
        
        const results: any[] = [];
        
        for (let i = 0; i < exchanges.length; i++) {
          const exchange = exchanges[i];
          setProgressLabel(`Fetching from ${exchange.name}...`);
          
          const result = await exchange.fetchItems({ forceRefresh: false });
          results.push([
            ...result.workItems,
            ...result.pullRequests,
            ...result.pipelines,
          ]);
          
          setProgressCurrent(i + 1);
        }
        
        const allItems = results.flat();
        const hadItems = items.length > 0;
        const itemCountChanged = hadItems && allItems.length !== items.length;
        
        setItems(allItems);
        setLastUpdated(new Date());
        
        // Show notification if we had cached data and now have new items
        if (hadItems && itemCountChanged) {
          setHasNewItems(true);
        }
      } catch (error) {
        console.error('Failed to fetch items:', error);
      } finally {
        setLoading(false);
      }
    };

    // Small delay to let cached data show first
    const timer = setTimeout(fetchFreshData, 100);
    return () => clearTimeout(timer);
  }, [broker]);

  useEffect(() => {
    setMounted(true);
    setLastUpdated(new Date());

    const handleFocus = () => {
      forceUpdate((n) => n + 1);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        forceUpdate((n) => n + 1);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Process inbox items for this specific instance: filter, sort, and group
  const groupedFilteredItems = useMemo(() => {
    return processTypedItems(items, searchQuery, filterBy, sortBy);
  }, [items, searchQuery, filterBy, sortBy]);

  const onRefreshStart = async () => {
    setRefreshing(true);
    setShowNewItemsNotification(false);
    setHasNewItems(false);
    
    try {
      const exchanges = broker.getAllExchanges();
      setProgressTotal(exchanges.length);
      setProgressCurrent(0);
      
      const results: any[] = [];
      
      for (let i = 0; i < exchanges.length; i++) {
        const exchange = exchanges[i];
        setProgressLabel(`Refreshing ${exchange.name}...`);
        
        const result = await exchange.fetchItems({ forceRefresh: true });
        results.push([
          ...result.workItems,
          ...result.pullRequests,
          ...result.pipelines,
        ]);
        
        setProgressCurrent(i + 1);
      }
      
      const allItems = results.flat();
      setItems(allItems);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Background polling for new or updated items
  useEffect(() => {
    const pollInterval = 5 * 60 * 1000; // 5 minutes
    
    const pollForUpdates = async () => {
      if (document.hidden) return; // Don't poll if page is hidden
      
      try {
        const exchanges = broker.getAllExchanges();
        const results = await Promise.all(
          exchanges.map(async (exchange) => {
            const result = await exchange.fetchItems({ forceRefresh: true });
            return [
              ...result.workItems,
              ...result.pullRequests,
              ...result.pipelines,
            ];
          })
        );
        
        const allItems = results.flat();
        
        // Create a map of current items by ID for quick lookup
        const currentItemsMap = new Map(items.map(item => [item.id, item]));
        
        // Check for new items or updated items
        let hasUpdates = false;
        
        // Check if we have new items
        if (allItems.length > items.length) {
          hasUpdates = true;
        } else {
          // Check if any existing items have been updated
          for (const newItem of allItems) {
            const currentItem = currentItemsMap.get(newItem.id);
            if (currentItem && newItem.updateTimestamp > currentItem.updateTimestamp) {
              hasUpdates = true;
              break;
            }
          }
        }
        
        if (hasUpdates) {
          setShowNewItemsNotification(true);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };
    
    const interval = setInterval(pollForUpdates, pollInterval);
    return () => clearInterval(interval);
  }, [broker, items]);
  
  const handleNotificationAction = (refresh: boolean) => {
    setShowNewItemsNotification(false);
    if (refresh) {
      onRefreshStart();
    }
  };

  const handleMarkAsRead = (itemId: string) => {
    broker.markAsRead(itemId);
    // Force re-render by updating items state
    setItems([...items]);
    // Notify sidebar to update badge counts
    window.dispatchEvent(new CustomEvent('inbox-items-updated'));
  };

  const handleMarkAsUnread = (itemId: string) => {
    broker.markAsUnread(itemId);
    // Force re-render by updating items state
    setItems([...items]);
    // Notify sidebar to update badge counts
    window.dispatchEvent(new CustomEvent('inbox-items-updated'));
  };

  const handleMarkAllAsRead = (itemIds: string[]) => {
    itemIds.forEach(id => broker.markAsRead(id));
    // Force re-render by updating items state
    setItems([...items]);
    // Notify sidebar to update badge counts
    window.dispatchEvent(new CustomEvent('inbox-items-updated'));
  };

  const handleMarkAllAsUnread = (itemIds: string[]) => {
    itemIds.forEach(id => broker.markAsUnread(id));
    // Force re-render by updating items state
    setItems([...items]);
    // Notify sidebar to update badge counts
    window.dispatchEvent(new CustomEvent('inbox-items-updated'));
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="p-6 mx-auto">
      <InboxContainer>
        <InboxHeader>
          <InboxRow className="items-center gap-4">
            <Inbox className="h-8 w-8" />
            <h1 className="text-3xl font-bold">
              {"Inbox"}
            </h1>
          </InboxRow>
          <InboxRow>
            <InboxSearch
              value={searchQuery}
              onChange={setSearchQuery}
              suggestions={searchSuggestions}
            />
          </InboxRow>
        </InboxHeader>
        <InboxContent>
          <NotificationPopupContainer
            show={showNewItemsNotification}
            onClick={handleNotificationAction}
            buttonText={{
              action: "Refresh",
              dismiss: "Dismiss",
            }}
            actionButtonIcon={RefreshCw}
            colorScheme="blue"
          />
          <InboxRow className="items-center gap-2 my-2">
            <Button
              variant="ghost"
              onClick={onRefreshStart}
              disabled={refreshing}
            >
              <RefreshCw className={refreshing ? "animate-spin" : ""} />
              <p className="text-sm text-muted-foreground">
                Last updated{" "}
                {DateTime.fromJSDate(new Date(lastUpdated)).toRelative()}
              </p>
            </Button>

            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <ListFilter />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="">
                  <DropdownMenuRadioGroup
                    className="space-y-2"
                    value={filterBy}
                    onValueChange={(value) => setFilterBy(value as FilterOption)}
                  >
                    {filterOptions.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                      >
                        <option.icon /> {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <ArrowUpDown />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="space-y-2">
                  <DropdownMenuRadioGroup
                    className="space-y-2"
                    value={sortBy}
                    onValueChange={(value) => setSortBy(value as SortOption)}
                  >
                    {sortOptions.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                      >
                        <option.icon /> {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <MoreVertical size="icon" className="rounded-full" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>
                    <Mail className="mr-2 h-4 w-4" />
                    No actions available
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </InboxRow>
          {(refreshing || loading) && progressTotal > 0 && (
            <InboxRow className="flex-col">
              <ProgressContainer 
                current={progressCurrent} 
                total={progressTotal}
                label={progressLabel}
              />
            </InboxRow>
          )}

          <InboxRow className="flex-col">
            {Object.keys(groupedFilteredItems).length === 0 && !refreshing ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No items found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery ? "Try adjusting your search or filters" : "Your inbox is empty"}
                </p>
                {!broker?.isConfigured() && (
                  <Button variant="outline" onClick={() => window.location.href = '/settings'}>
                    Configure Integration
                  </Button>
                )}
              </div>
            ) : (
              Object.keys(groupedFilteredItems).map((projectKey) => {
                const group = groupedFilteredItems[projectKey];
                const itemIds = group.items.map((item: any) => item.id);
                return (
                  <ProjectCardComponent
                    key={projectKey}
                    group={{
                      projectName: projectKey,
                      instanceName: group.instance?.name || "Unknown",
                    }}
                    instanceType={group.instance?.instanceType}
                    onMarkAllAsRead={() => handleMarkAllAsRead(itemIds)}
                    onMarkAllAsUnread={() => handleMarkAllAsUnread(itemIds)}
                  >
                    {group.items.map((item: any) => (
                      <InboxItemCard 
                        key={item.id} 
                        item={item}
                        onMarkAsRead={handleMarkAsRead}
                        onMarkAsUnread={handleMarkAsUnread}
                      />
                    ))}
                  </ProjectCardComponent>
                );
              })
            )}
          </InboxRow>
        </InboxContent>
        <InboxFooter></InboxFooter>
      </InboxContainer>
    </div>
  );
}
