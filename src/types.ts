export interface Article {
  date: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  author: number | string;
  categories: (number | string)[];
  yoast_head_json?: {
    og_image?: Array<{
      url: string;
    }>;
  };
}

export interface AppConfig {
  files: string[];
}
