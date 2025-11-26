// implement cloudflare Zaraz here 


export const TrackEvent = (eventName: string, properties?: Record<string, any>) => {
  // check if we got valid consent for anonymous tracking

  const hasConsent = false; // Replace with actual consent check logic

  if (typeof window === "undefined" || !(window as any).zaraz || !hasConsent) {
    return;
  }

  try {
    (window as any).zaraz.track(eventName, properties || {});
  } catch (error) {
    console.error("Failed to track event:", error);
  }
};