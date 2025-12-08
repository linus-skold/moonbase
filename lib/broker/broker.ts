import { integrationStorage } from "@/lib/utils/integration-storage";
import { createExchange as createAdoExchange } from "@/lib/exchanges/ado/ado-exchange";
import { createExchange as createGhExchange } from "@/lib/exchanges/gh/gh-exchange";
import type {
  TypedItem,
  WorkItem,
  PullRequest,
  Pipeline,
} from "@/lib/schema/item.schema";
import type { IntegrationInstance } from "@/lib/schema/config.schema";
import type { IntegrationExchange } from "@/lib/exchanges/integration-exchange";

import { loadItems, saveItems } from "@/lib/utils/item-storage";



export class InboxBroker {
  private exchanges: Map<string, IntegrationExchange> = new Map();

  constructor() {
    // Don't create exchanges in constructor - they'll be created lazily
  }

  /**
   * Lazily create an exchange for an instance
   */
  private ensureExchange(instanceId: string): IntegrationExchange | null {
    if (typeof window === "undefined") {
      return null;
    }

    // Return existing exchange if already created
    if (this.exchanges.has(instanceId)) {
      return this.exchanges.get(instanceId)!;
    }

    // Load instance config and create exchange
    const instance = integrationStorage.loadInstance(instanceId);
    if (!instance) {
      return null;
    }

    try {
      const exchange =
        instance.instanceType === "ado"
          ? createAdoExchange(instance.id)
          : createGhExchange(instance.id);
      
      this.exchanges.set(instance.id, exchange);
      return exchange;
    } catch (error) {
      console.error(`Failed to create exchange for ${instanceId}:`, error);
      return null;
    }
  }

  /**
   * Get exchange for a specific instance (lazy load)
   */
  getExchange(instanceId: string): IntegrationExchange | null {
    return this.ensureExchange(instanceId);
  }

  /**
   * Get all exchanges (lazy load)
   */
  getAllExchanges(): IntegrationExchange[] {
    if (typeof window === "undefined") {
      return [];
    }

    const instances = this.getInstances();
    const exchanges: IntegrationExchange[] = [];

    for (const instance of instances) {
      const exchange = this.ensureExchange(instance.id);
      if (exchange) {
        exchanges.push(exchange);
      }
    }

    return exchanges;
  }

  /**
   * Get all configured integration instances
   */
  getInstances(): IntegrationInstance[] {
    if (typeof window === "undefined") {
      return [];
    }

    const config = integrationStorage.loadAll();
    if (!config) {
      return [];
    }

    return Object.values(config.instances);
  }

  getInstance(id: string): IntegrationInstance | null {
    return integrationStorage.loadInstance(id);
  }

  async getAllItems(): Promise<TypedItem[]> {
    const exchanges = this.getAllExchanges();
    const results = await Promise.all(
      exchanges.map((exchange) => exchange.getAllItems())
    );

    return results.flat();
  }

  async fetchAllItems(): Promise<TypedItem[]> {
    const exchanges = this.getAllExchanges();
    const allItems: TypedItem[] = [];

    const results = await Promise.allSettled(
      exchanges.map((exchange) => exchange.fetchItems({ forceRefresh: false }))
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const { workItems, pullRequests, pipelines } = result.value;
        allItems.push(...workItems, ...pullRequests, ...pipelines);
      } else {
        console.error(
          `Error fetching from exchange ${exchanges[index].name}:`,
          result.reason
        );
      }
    });

    return allItems;
  }

  /**
   * Fetch items for a specific instance
   */
  async fetchItemsForInstance(instanceId: string): Promise<TypedItem[]> {
    const exchange = this.getExchange(instanceId);
    if (!exchange) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    const { workItems, pullRequests, pipelines } = await exchange.fetchItems({
      forceRefresh: false,
    });

    return [...workItems, ...pullRequests, ...pipelines];
  }

  async getWorkItems(instanceId: string): Promise<WorkItem[]> {
    const exchange = this.getExchange(instanceId);
    if (!exchange) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    return exchange.getWorkItems();
  }

  async fetchWorkItems(): Promise<WorkItem[]> {
    const allItems = await this.fetchAllItems();
    return allItems.filter(
      (item): item is WorkItem => item.type === "workItem"
    );
  }


  async getPullRequests(instanceId: string): Promise<PullRequest[]> {
    const exchange = this.getExchange(instanceId);
    if (!exchange) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    return exchange.getPullRequests();
  }

  async fetchPullRequests(): Promise<PullRequest[]> {
    const allItems = await this.fetchAllItems();
    return allItems.filter(
      (item): item is PullRequest => item.type === "pullRequest"
    );
  }


  async getPipelines(instanceId: string): Promise<Pipeline[]> {
    const exchange = this.getExchange(instanceId);
    if (!exchange) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    return exchange.getPipelines();
  }

  async fetchPipelines(): Promise<Pipeline[]> {
    const allItems = await this.fetchAllItems();
    return allItems.filter(
      (item): item is Pipeline => item.type === "pipeline"
    );
  }

  /**
   * Check if any instances are configured
   */
  isConfigured(): boolean {
    return this.getInstances().length > 0;
  }

  /**
   * Mark an item as read across all exchanges
   */
  markAsRead(itemId: string): void {
    const exchanges = this.getAllExchanges();
    exchanges.forEach(exchange => {
      const updateUnreadState = (items: any[]) => {
        const item = items.find(i => i.id === itemId);
        if (item) {
          item.unread = false;
          return true;
        }
        return false;
      };
      
      // Update in all cached arrays and persist if found
      const found = updateUnreadState(exchange.getWorkItems()) ||
                    updateUnreadState(exchange.getPullRequests()) ||
                    updateUnreadState(exchange.getPipelines());
      
      if (found && typeof window !== 'undefined') {
        // Persist entire item cache to localStorage
        saveItems(exchange.id, {
          workItems: exchange.getWorkItems(),
          pullRequests: exchange.getPullRequests(),
          pipelines: exchange.getPipelines(),
        });
      }
    });
  }

  /**
   * Mark an item as unread across all exchanges
   */
  markAsUnread(itemId: string): void {
    const exchanges = this.getAllExchanges();
    exchanges.forEach(exchange => {
      const updateUnreadState = (items: any[]) => {
        const item = items.find(i => i.id === itemId);
        if (item) {
          item.unread = true;
          return true;
        }
        return false;
      };
      
      // Update in all cached arrays and persist if found
      const found = updateUnreadState(exchange.getWorkItems()) ||
                    updateUnreadState(exchange.getPullRequests()) ||
                    updateUnreadState(exchange.getPipelines());
      
      if (found && typeof window !== 'undefined') {
        // Persist entire item cache to localStorage
        saveItems(exchange.id, {
          workItems: exchange.getWorkItems(),
          pullRequests: exchange.getPullRequests(),
          pipelines: exchange.getPipelines(),
        });
      }
    });
  }
}

export const createBroker = () => new InboxBroker();
