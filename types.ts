export interface HNStory {
  id: number;
  by: string;
  descendants: number;
  score: number;
  time: number;
  title: string;
  url: string;
  type: string;
  kids?: number[];
  translatedTitle?: string;
}

export interface HNComment {
  id: number;
  by: string;
  text: string;
  time: number;
  type: 'comment';
  deleted?: boolean;
}
