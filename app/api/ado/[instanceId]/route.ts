import { NextRequest, NextResponse } from 'next/server';
import { AdoService } from '@/lib/exchanges/ado/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await params;

  try {
    // Get instance config from request body (sent from client)
    const body = await request.json();
    const instance = body.instance;
    
    if (!instance || instance.instanceType !== 'ado') {
      return NextResponse.json(
        { error: 'Invalid ADO instance configuration' },
        { status: 400 }
      );
    }

    // Create service with single instance
    const service = new AdoService({
      instances: [instance],
      pinnedProjects: []
    });

    // Fetch all items
    const items = await service.fetchAllInboxItems();

    // Separate by type
    const workItems = items.filter(item => item.type === 'workItem');
    const pullRequests = items.filter(item => item.type === 'pullRequest');
    const pipelines = items.filter(item => item.type === 'pipeline');

    return NextResponse.json({
      workItems,
      pullRequests,
      pipelines,
    });
  } catch (error) {
    console.error(`Error fetching ADO items for instance ${instanceId}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch ADO items', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
