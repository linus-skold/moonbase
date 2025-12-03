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

export class InboxBroker {
  private exchanges: Map<string, IntegrationExchange> = new Map();

  constructor() {
    this.refreshExchanges();
  }

  /**
   * Refresh the exchanges map based on current storage
   */
  private refreshExchanges(): void {
    if (typeof window === "undefined") {
      return;
    }

    const instances = this.getInstances();
    const currentIds = new Set(instances.map((i) => i.id));

    // Remove exchanges for deleted instances
    for (const [id] of this.exchanges) {
      if (!currentIds.has(id)) {
        this.exchanges.delete(id);
      }
    }

    // Add exchanges for new instances
    instances.forEach((instance) => {
      if (!this.exchanges.has(instance.id)) {
        const exchange =
          instance.instanceType === "ado"
            ? createAdoExchange(instance.id)
            : createGhExchange(instance.id);
        this.exchanges.set(instance.id, exchange);
      }
    });
  }

  /**
   * Get exchange for a specific instance
   */
  getExchange(instanceId: string): IntegrationExchange | null {
    this.refreshExchanges(); // Ensure exchanges are up to date
    return this.exchanges.get(instanceId) || null;
  }

  /**
   * Get all exchanges
   */
  getAllExchanges(): IntegrationExchange[] {
    this.refreshExchanges();
    return Array.from(this.exchanges.values());
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
}

export const createBroker = () => new InboxBroker();
