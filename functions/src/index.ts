import { setGlobalOptions } from "firebase-functions/v2";

// Mumbai region: lowest latency for Indian users. Functions are added in Phases 2 and 5.
setGlobalOptions({ region: "asia-south1", maxInstances: 20 });
