import { NextRequest, NextResponse } from 'next/server';
import { AdoService } from '@/lib/ado/service';
import type { AdoConfig } from '@/lib/ado/schema/config.schema';

export async function POST(request: NextRequest) {
  try {
    const config: AdoConfig = await request.json();
    
    if (!config || !config.instances || config.instances.length === 0) {
      return NextResponse.json({ error: 'Invalid configuration' }, { status: 400 });
    }

    const service = new AdoService(config);
    const groupedItems = await service.fetchAndGroupInboxItems();
    
    return NextResponse.json(groupedItems);
  } catch (error) {
    console.error('Error fetching ADO inbox items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inbox items', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
