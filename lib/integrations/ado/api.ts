/// create an implemenetation of the ado api

export async function fetchAuthenticatedUserId(
  baseUrl: string,
  pat: string
): Promise<string | null> {
  try {
    const url = `${baseUrl}/_apis/connectionData`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${btoa(`:${pat}`)}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch user ID: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();
    return data.authenticatedUser?.id || null;
  } catch (error) {
    console.error("Error fetching authenticated user ID:", error);
    return null;
  }
}