/**
 * Shared type definitions for the unified Team D mobile application.
 *
 * These interfaces mirror the types originally provided by the
 * `@large-event/api-types` package and the `mobile-components` workspace.
 * Defining them locally removes the need for external type packages and
 * simplifies cross‑platform builds, particularly on Windows.
 */

/**
 * Represents an authenticated user. The `name` field replaces separate
 * first/last names to match the current backend schema.
 */
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  isSystemAdmin: boolean;
}

/**
 * Summary of an organization that owns an instance. Some organizations
 * provide an acronym in addition to their full name.
 */
export interface OrganizationSummary {
  id: number;
  name: string;
  acronym: string | null;
}

/**
 * Access levels that control what actions a user can perform within
 * an instance. This type is used by the frontend to display badges and
 * determine available actions.
 */
export type InstanceAccessLevel = 'web_user' | 'web_admin' | 'both';

/**
 * Data returned for a single instance. Each instance belongs to an
 * organization and specifies the user's access level.
 */
export interface InstanceResponse {
  id: number;
  name: string;
  accessLevel: InstanceAccessLevel;
  ownerOrganization: OrganizationSummary;
}

/**
 * A list of instances along with a total count. This mirrors the
 * structure returned by the API when fetching all instances.
 */
export interface InstanceListResponse {
  instances: InstanceResponse[];
  count: number;
}

/**
 * Represents a calendar or event entry from Team B's database. These fields
 * mirror the columns defined in `db/src/schemas/events.ts` so that the
 * mobile application can work with event data without directly importing
 * server-only code. Timestamps are represented as ISO strings for
 * compatibility with React Native.
 */
export interface Event {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  capacity: number;
  isPublic: boolean;
  status: string;
  cost: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents a survey or form. Forms consist of one or more questions
 * that users answer. This mirrors the structure returned by the
 * backend and used in the web project.
 */
export interface Form {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * A single question within a form. Questions can be of different
 * types such as text input, multiple choice or linear scale. Some
 * questions may depend on the answer of another question.
 */
export interface FormQuestion {
  id: number;
  formId: number;
  question: string;
  type: 'text' | 'multipleChoice' | 'linearScale';
  options: string[] | null;
  required: boolean;
  order: number;
  parentQuestionId: number | null;
  enablingAnswers: string[] | null;
}

/**
 * A saved answer for a form question. The structure of the answer
 * property depends on the question type. For multiple choice it
 * contains the selected option; for linear scale a numeric value;
 * for text questions a string.
 */
export interface FormAnswer {
  id: number;
  formId: number;
  userId: number;
  questionId: number;
  answer: any;
}

/**
 * Status of a user's submission for a form. If no submission has
 * started the status will be 'unfilled'. If answers exist but the
 * form has not been submitted the status is 'started'. After
 * submission the status is 'completed' and the submissionId is
 * provided.
 */
export interface FormStatus {
  status: 'unfilled' | 'started' | 'completed';
  submissionId: number | null;
}

/**
 * Props passed to Team D mobile components by the mobile app. This
 * includes the authenticated user, JWT token, and a list of instances
 * visible to the user. An optional callback allows the component to
 * signal navigation events back to the host app.
 */
export interface TeamComponentProps {
  user: AuthUser;
  token: string;
  instances: InstanceResponse[];
  onNavigateBack?: () => void;
}
