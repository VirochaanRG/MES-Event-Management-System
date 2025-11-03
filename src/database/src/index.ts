import { createDatabase, type DatabaseConfig } from '@large-event/database';
import * as sharedSchema from '@large-event/database/schemas';
import * as overlaySchema from './overlays';

export interface TeamDDatabaseConfig extends DatabaseConfig {
  useOverlays?: boolean;
}

export function createTeamDDatabase(config?: TeamDDatabaseConfig) {
  const mergedSchema = {
    ...sharedSchema,
    ...overlaySchema,
  };

  return createDatabase(config);
}

export { sharedSchema, overlaySchema };

export const db = createTeamDDatabase();

export type TeamDDatabase = ReturnType<typeof createTeamDDatabase>;