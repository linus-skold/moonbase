export async function fetchAuthenticatedUserId(
  baseUrl: string,
  pat: string
): Promise<string | null> {
  try {
    const response = await fetch('/api/ado/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ baseUrl, pat }),
    });

    if (!response.ok) {
      console.error('Failed to test ADO connection:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.success ? data.userId : null;
  } catch (error) {
    console.error("Error fetching authenticated user ID:", error);
    return null;
  }
}