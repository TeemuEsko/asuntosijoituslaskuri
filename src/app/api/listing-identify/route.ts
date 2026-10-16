import { acquireListing } from "@/core/listing-acquisition/acquire-listing";
import { allowListingIdentifyAttempt } from "@/server/access/listing-identify-rate-limit";
import { handleListingIdentify } from "@/server/listing-identify/handler";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  return handleListingIdentify(request, {
    acquireListing: (value) => acquireListing(value),
    allowAttempt: (currentRequest) => allowListingIdentifyAttempt({
      request: currentRequest,
    }),
  });
}
