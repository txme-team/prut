// Phase 2 Supabase 마이그레이션 후 `supabase gen types typescript` 로 자동 생성됩니다.
// 임시 수동 타입 정의

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Era            = "classic" | "modern";
export type SourceType     = "handle" | "playlist";
export type CandidateStatus = "pending" | "reserved" | "hidden";

export type Database = {
  public: {
    Tables: {
      sources: {
        Row: {
          id:              string;
          name:            string;
          type:            SourceType;
          source_value:    string;
          era:             Era;
          is_active:       boolean;
          note:            string | null;
          created_at:      string;
          last_run_at:     string | null;
          last_run_count:  number | null;
        };
        Insert: {
          id?:             string;
          name:            string;
          type:            SourceType;
          source_value:    string;
          era?:            Era;
          is_active?:      boolean;
          note?:           string | null;
          created_at?:     string;
          last_run_at?:    string | null;
          last_run_count?: number | null;
        };
        Update: {
          id?:             string;
          name?:           string;
          type?:           SourceType;
          source_value?:   string;
          era?:            Era;
          is_active?:      boolean;
          note?:           string | null;
          last_run_at?:    string | null;
          last_run_count?: number | null;
        };
        Relationships: [];
      };
      youtube_candidates: {
        Row: {
          id:            string;
          video_id:      string;
          title:         string;
          channel:       string;
          source_name:   string;
          era:           Era;
          duration_sec:  number;
          views:         number;
          likes:         number;
          comments:      number;
          like_rate:     number;
          comment_rate:  number;
          published_at:  string | null;
          thumbnail_url: string | null;
          score_viral:   number;
          score_comment: number;
          score_fit:     number;
          score_season:  number;
          score_fresh:   number;
          final_score:   number;
          stars:         number;
          status:        CandidateStatus;
          collected_at:  string;
        };
        Insert: {
          id?:           string;
          video_id:      string;
          title:         string;
          channel:       string;
          source_name:   string;
          era?:          Era;
          duration_sec?: number;
          views?:        number;
          likes?:        number;
          comments?:     number;
          like_rate?:    number;
          comment_rate?: number;
          published_at?: string | null;
          thumbnail_url?:string | null;
          score_viral?:  number;
          score_comment?:number;
          score_fit?:    number;
          score_season?: number;
          score_fresh?:  number;
          final_score?:  number;
          stars?:        number;
          status?:       CandidateStatus;
          collected_at?: string;
        };
        Update: {
          id?:           string;
          video_id?:     string;
          title?:        string;
          channel?:      string;
          source_name?:  string;
          era?:          Era;
          duration_sec?: number;
          views?:        number;
          likes?:        number;
          comments?:     number;
          like_rate?:    number;
          comment_rate?: number;
          published_at?: string | null;
          thumbnail_url?:string | null;
          score_viral?:  number;
          score_comment?:number;
          score_fit?:    number;
          score_season?: number;
          score_fresh?:  number;
          final_score?:  number;
          stars?:        number;
          status?:       CandidateStatus;
        };
        Relationships: [];
      };
      seen_videos: {
        Row: {
          id:          string;
          video_id:    string;
          reserved_at: string;
        };
        Insert: {
          id?:          string;
          video_id:     string;
          reserved_at?: string;
        };
        Update: {
          id?:          string;
          video_id?:    string;
          reserved_at?: string;
        };
        Relationships: [];
      };
      monitor_runs: {
        Row: {
          id:                  string;
          run_at:              string;
          total_collected:     number;
          total_filtered:      number;
          total_rejected_fit:  number;
          sources_run:         number;
          error:               string | null;
        };
        Insert: {
          id?:                  string;
          run_at?:              string;
          total_collected?:     number;
          total_filtered?:      number;
          total_rejected_fit?:  number;
          sources_run?:         number;
          error?:               string | null;
        };
        Update: {
          error?: string | null;
        };
        Relationships: [];
      };
    };
    Views:     Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      era_type:         Era;
      source_type:      SourceType;
      candidate_status: CandidateStatus;
    };
  };
};
