export type Intent =
  | "ask"
  | "build"
  | "share"
  | "discuss"
  | "reflect";

export type UserSummary = {
  _id: string;
  id: string;
  name: string;
  surname?: string;
  email?: string;
  phoneNumber?: string;
  username?: string;
  bio?: string;
  description?: string;
  avatar?: string;
  isProfileComplete?: boolean;
  signupStep?: number;
  followers?: string[];
  following?: string[];
  followersCount?: number;
  followingCount?: number;
};

export type Post = {
  _id: string;
  author: UserSummary;
  content: string;
  image?: string;
  intent?: Intent;
  likes: string[];
  commentsCount?: number;
  sharesCount?: number;
  createdAt: string;
};

export type Comment = {
  _id: string;
  author?: UserSummary;
  content: string;
  createdAt: string;
};

export type Conversation = {
  _id: string;
  participants: UserSummary[];
};

export type Message = {
  _id: string;
  sender: UserSummary;
  content: string;
  createdAt: string;
  conversation: string;
};

export type Notification = {
  _id: string;
  type: "follow" | "like" | "comment" | "message";
  sender: UserSummary;
  post?: {
    _id: string;
  };
  isRead: boolean;
  createdAt: string;
};

export type ProfileFormData = {
  username: string;
  name: string;
  surname: string;
  phoneNumber: string;
  bio: string;
  description: string;
};

export type GoogleCredentialResponseLite = {
  credential?: string;
};

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "violence"
  | "nudity"
  | "misinformation"
  | "other";

export type ReportStatus = "open" | "in_review" | "resolved" | "rejected" | "actioned";

export type ReportAction = "none" | "post_deleted";

export type ModerationActionRequest = "post_deleted";

export type ReportTargetPost = {
  _id: string;
  content: string;
  image?: string;
  createdAt: string;
  author?: UserSummary;
};

export type Report = {
  _id: string;
  targetType: "post";
  targetId: ReportTargetPost | string;
  reportedBy: UserSummary;
  postAuthor: UserSummary;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  reviewedBy?: UserSummary;
  reviewedAt?: string;
  moderatorNotes?: string;
  actionTaken: ReportAction;
  createdAt: string;
  updatedAt: string;
};
