import { NextRequest, NextResponse } from 'next/server';
import { AdoClient } from '@/lib/exchanges/ado/client';
import { AdoIntegrationInstance } from '@/lib/exchanges/ado/schema/config.schema';
import { transformToPullRequest, transformToWorkItem, transformToPipeline } from '@/lib/exchanges/ado/transforms';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await params;

  try {
    // Get instance config from request body (sent from client)
    const body = await request.json();
    const instance: AdoIntegrationInstance = body.instance;
    
    if (!instance || instance.instanceType !== 'ado') {
      return NextResponse.json(
        { error: 'Invalid ADO instance configuration' },
        { status: 400 }
      );
    }

    // Create client for this instance
    const client = new AdoClient(instance);

    // Fetch all projects for reference (needed for mapping work items)
    const projects = await client.getAllProjects(50);

    // Fetch PRs and work items in parallel
    const [prs, workItemsData] = await Promise.all([
      client.getPullRequestsAssignedToMe(),
      client.getWorkItemsAssignedToMe(),
    ]);

    // Transform to internal types
    const pullRequests = prs.map(pr => transformToPullRequest(pr, instance));
    
    const workItems = workItemsData.map(wi => {
      // Find project name from area path
      const project = projects.find(p => 
        wi.fields['System.AreaPath']?.startsWith(p.name)
      );
      return transformToWorkItem(wi, instance, project?.name || 'Unknown');
    });

    return NextResponse.json({
      workItems,
      pullRequests,
    });
  } catch (error) {
    console.error(`Error fetching ADO items for instance ${instanceId}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch ADO items', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
