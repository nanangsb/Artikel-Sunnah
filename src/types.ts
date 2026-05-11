export interface Article {
  id: number;
  date: string;
  slug: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  author: number;
  categories: number[];
  yoast_head_json?: {
    og_site_name?: string;
    og_image?: Array<{
      url: string;
    }>;
    author?: string;
  };
}

export interface AppConfig {
  files: string[];
}
