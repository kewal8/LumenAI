/** The longest feedback message kept. The same limit is on the table. */
export const FEEDBACK_MAX = 4000;

/** How many messages one person can send in a day, so the inbox cannot be flooded. */
export const FEEDBACK_PER_DAY = 20;

export type FeedbackRow = {
  id: string;
  message: string;
  senderName: string;
  senderEmail: string;
  orgName: string | null;
  page: string | null;
  createdAt: string;
};
