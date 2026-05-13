export interface Song {
  id: string;
  source: "airtable" | "app";
  airtableRecordId: string | null;
  submitterUserId: string | null;
  submitterName: string;
  submitterEmail: string | null;
  artistName: string | null;
  songTitle: string | null;
  description: string | null;
  youtubeUrl: string;
  youtubeVideoId: string;
  submittedDate: string;
  month: number;
  year: number;
  likeCount: number;
  commentCount: number;
  userLiked: boolean;
}

export interface EngagementUser {
  id: string;
  name: string;
  email: string;
  picture: string | null;
}

export interface SongLiker {
  user: EngagementUser;
  likedAt: string;
}

export interface SongCommentReply {
  id: number;
  songId: string;
  parentCommentId: number;
  body: string;
  author: EngagementUser;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canDelete: boolean;
}

export interface SongComment {
  id: number;
  songId: string;
  parentCommentId: null;
  body: string;
  author: EngagementUser;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canDelete: boolean;
  replies: SongCommentReply[];
}

export interface SongEngagementSummary {
  songId: string;
  likeCount: number;
  commentCount: number;
  userLiked: boolean;
}

export type SongEngagementEvent =
  | {
      type: "song_engagement_updated";
      songId: string;
      likeCount: number;
      commentCount: number;
      actorUserId?: string;
      actorLiked?: boolean;
    }
  | {
      type: "song_comment_notification";
      songId: string;
      commentId: number;
      commenterName: string;
      songSubmitterUserId: string;
      createdAt: string;
    };

export interface CreateSongInput {
  youtubeUrl: string;
  description?: string;
}

export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: {
    submitterName?: string;
    artistName?: string;
    songTitle?: string;
    songDescription?: string;
    youtubeLink?: string;
    submittedDate?: string;
  };
}

export interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}


