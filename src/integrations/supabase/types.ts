export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          criteria_type: string
          criteria_value: number
          description: string
          icon: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          criteria_type: string
          criteria_value: number
          description: string
          icon?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          criteria_type?: string
          criteria_value?: number
          description?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          challenge_date: string
          completed_at: string | null
          created_at: string
          id: string
          overall_score: number | null
          prefix_word: string | null
          prefix_word_meaning: string | null
          recall_score: number | null
          speaking_score: number | null
          stage: string
          status: string
          streak_awarded: boolean
          user_id: string
          vocabulary_word_id: string | null
          word: string
          writing_score: number | null
        }
        Insert: {
          challenge_date: string
          completed_at?: string | null
          created_at?: string
          id?: string
          overall_score?: number | null
          prefix_word?: string | null
          prefix_word_meaning?: string | null
          recall_score?: number | null
          speaking_score?: number | null
          stage?: string
          status?: string
          streak_awarded?: boolean
          user_id: string
          vocabulary_word_id?: string | null
          word: string
          writing_score?: number | null
        }
        Update: {
          challenge_date?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          overall_score?: number | null
          prefix_word?: string | null
          prefix_word_meaning?: string | null
          recall_score?: number | null
          speaking_score?: number | null
          stage?: string
          status?: string
          streak_awarded?: boolean
          user_id?: string
          vocabulary_word_id?: string | null
          word?: string
          writing_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_challenges_vocabulary_word_id_fkey"
            columns: ["vocabulary_word_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_words"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          notifications_enabled: boolean
          theme: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          notifications_enabled?: boolean
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notifications_enabled?: boolean
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      recall_submissions: {
        Row: {
          antonym: string | null
          antonym_correct: boolean
          challenge_id: string
          created_at: string
          feedback: string | null
          id: string
          score: number | null
          synonym: string | null
          synonym_correct: boolean
          user_id: string
        }
        Insert: {
          antonym?: string | null
          antonym_correct?: boolean
          challenge_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          score?: number | null
          synonym?: string | null
          synonym_correct?: boolean
          user_id: string
        }
        Update: {
          antonym?: string | null
          antonym_correct?: boolean
          challenge_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          score?: number | null
          synonym?: string | null
          synonym_correct?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recall_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_items: {
        Row: {
          id: string
          last_score: number | null
          mastery_status: string
          next_review_date: string
          review_count: number
          updated_at: string
          user_id: string
          vocabulary_word_id: string
          word: string
        }
        Insert: {
          id?: string
          last_score?: number | null
          mastery_status?: string
          next_review_date?: string
          review_count?: number
          updated_at?: string
          user_id: string
          vocabulary_word_id: string
          word: string
        }
        Update: {
          id?: string
          last_score?: number | null
          mastery_status?: string
          next_review_date?: string
          review_count?: number
          updated_at?: string
          user_id?: string
          vocabulary_word_id?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_items_vocabulary_word_id_fkey"
            columns: ["vocabulary_word_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_words"
            referencedColumns: ["id"]
          },
        ]
      }
      sentence_submissions: {
        Row: {
          challenge_id: string
          created_at: string
          feedback: string | null
          id: string
          passed: boolean
          score: number | null
          sentence_number: number
          sentence_text: string
          typing_duration: number | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          passed?: boolean
          score?: number | null
          sentence_number: number
          sentence_text: string
          typing_duration?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          passed?: boolean
          score?: number | null
          sentence_number?: number
          sentence_text?: string
          typing_duration?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sentence_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      speech_submissions: {
        Row: {
          challenge_id: string
          created_at: string
          feedback: string | null
          fluency_score: number | null
          grammar_score: number | null
          id: string
          overall_score: number | null
          pronunciation_score: number | null
          target_word_detected: boolean
          transcript: string | null
          usage_score: number | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          feedback?: string | null
          fluency_score?: number | null
          grammar_score?: number | null
          id?: string
          overall_score?: number | null
          pronunciation_score?: number | null
          target_word_detected?: boolean
          transcript?: string | null
          usage_score?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          feedback?: string | null
          fluency_score?: number | null
          grammar_score?: number | null
          id?: string
          overall_score?: number | null
          pronunciation_score?: number | null
          target_word_detected?: boolean
          transcript?: string | null
          usage_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speech_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      streaks: {
        Row: {
          current_streak: number
          last_completed_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_completed_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_completed_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary_words: {
        Row: {
          antonyms: Json
          breakdown_available: boolean
          created_at: string
          detailed_meaning: string | null
          difficulty: string | null
          example: string | null
          id: string
          part_of_speech: string | null
          prefix: string | null
          prefix_example_meaning: string | null
          prefix_example_word: string | null
          prefix_meaning: string | null
          pronunciation: string | null
          root: string | null
          simple_meaning: string | null
          suffix: string | null
          synonyms: Json
          word: string
        }
        Insert: {
          antonyms?: Json
          breakdown_available?: boolean
          created_at?: string
          detailed_meaning?: string | null
          difficulty?: string | null
          example?: string | null
          id?: string
          part_of_speech?: string | null
          prefix?: string | null
          prefix_example_meaning?: string | null
          prefix_example_word?: string | null
          prefix_meaning?: string | null
          pronunciation?: string | null
          root?: string | null
          simple_meaning?: string | null
          suffix?: string | null
          synonyms?: Json
          word: string
        }
        Update: {
          antonyms?: Json
          breakdown_available?: boolean
          created_at?: string
          detailed_meaning?: string | null
          difficulty?: string | null
          example?: string | null
          id?: string
          part_of_speech?: string | null
          prefix?: string | null
          prefix_example_meaning?: string | null
          prefix_example_word?: string | null
          prefix_meaning?: string | null
          pronunciation?: string | null
          root?: string | null
          simple_meaning?: string | null
          suffix?: string | null
          synonyms?: Json
          word?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
