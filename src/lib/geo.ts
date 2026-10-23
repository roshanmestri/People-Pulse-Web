// Location privacy rules (BRD §6 Privacy, FR-3 venue). Pure functions → unit-tested.

export type LatLng = { latitude: number; longitude: number };

/** Radius (metres) of the "somewhere around here" circle shown instead of an exact pin. */
export const APPROX_RADIUS_M = 800;

/**
 * Round to 2 decimal places (~1.1 km cells in India). Everyone near the same spot gets
 * the same rounded point, so it can't be averaged back to the exact venue.
 */
export function approximate({ latitude, longitude }: LatLng): LatLng {
  return {
    latitude: Math.round(latitude * 100) / 100,
    longitude: Math.round(longitude * 100) / 100,
  };
}

/**
 * Who may see the exact venue: the host always; approved members always; everyone else
 * only when the host chose to show it publicly.
 */
export function canSeeExactVenue(args: {
  viewerId: string | null;
  hostId: string;
  viewerIsApprovedMember: boolean;
  showExactVenue: boolean;
}) {
  if (args.viewerId && args.viewerId === args.hostId) return true;
  if (args.viewerIsApprovedMember) return true;
  return args.showExactVenue;
}
