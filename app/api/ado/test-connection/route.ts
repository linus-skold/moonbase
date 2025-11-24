import { NextRequest, NextResponse } from 'next/server';
import * as azdev from "azure-devops-node-api";

export async function POST(request: NextRequest) {
  try {
    const { baseUrl, pat } = await request.json();
    
    if (!baseUrl || !pat) {
      return NextResponse.json({ error: 'baseUrl and pat are required' }, { status: 400 });
    }

    const authHandler = azdev.getPersonalAccessTokenHandler(pat);
    const connection = new azdev.WebApi(baseUrl, authHandler);
    
    const connectionData = await connection.connect();
    const userId = connectionData.authenticatedUser?.id || null;
    
    if (userId) {
      return NextResponse.json({ success: true, userId });
    } else {
      return NextResponse.json({ success: false, error: 'Failed to retrieve user ID' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Connection failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
