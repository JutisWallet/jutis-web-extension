import type { ActivityRecord } from "@/core/models/types";
import { CANTON_DEMO_ACTIVITY } from "@/core/models/fixtures";

export class CantonActivityIndexer {
  async list(): Promise<ActivityRecord[]> {
    return CANTON_DEMO_ACTIVITY;
  }
}
