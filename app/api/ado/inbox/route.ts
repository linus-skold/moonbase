import { NextRequest, NextResponse } from 'next/server';
import { AdoService } from '@/lib/exchanges/ado/service';
import type { AdoConfig } from '@/lib/exchanges/ado/schema/config.schema';

export async function POST(request: NextRequest) {
  try {
    const config: AdoConfig = await request.json();
    
    if (!config || !config.instances || config.instances.length === 0) {
      return NextResponse.json({ error: 'Invalid configuration' }, { status: 400 });
    }

    const url = new URL(request.url);
    const streaming = url.searchParams.get('streaming') === 'true';

    const service = new AdoService(config);
    
    // If streaming is requested, use progressive fetching
    if (streaming) {
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const batch of service.fetchInboxItemsProgressive()) {
              const groupedBatch = service.groupInboxItems(batch.items);
              
              const data = JSON.stringify({
                type: 'progress',
                data: groupedBatch,
                progress: batch.progress,
              }) + '\n';
              
              controller.enqueue(encoder.encode(data));
            }
            
            // Send completion signal
            const completion = JSON.stringify({
              type: 'complete',
            }) + '\n';
            controller.enqueue(encoder.encode(completion));
            
            controller.close();
          } catch (error) {
            const errorData = JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            }) + '\n';
            controller.enqueue(encoder.encode(errorData));
            controller.close();
          }
        },
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    // Non-streaming: fetch all at once (backward compatible)
    const groupedItems = await service.fetchAndGroupInboxItems();
    return NextResponse.json(groupedItems);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch inbox items', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
