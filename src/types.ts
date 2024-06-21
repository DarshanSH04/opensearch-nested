export interface Event {
  event_id: string;
  name: string;
  description: string;
  timestamp: string;
}

export interface JobPost {
  id: string;
  entity_id: string;
  title: string;
  description: string;
  salary: number;
  tags: string[];
}

export interface Entity {
  entity_id: string;
  name: string;
  description: string;
  tags: string[];
  events: Event[];
  job_posts: JobPost[];
}

export const entityMapping = {
  "mappings": {
    "properties": {
      "name": { "type": "text" },
      "description": { "type": "text" },
      "tags": { "type": "keyword" },
      "events": {
        "type": "nested",
        "properties": {
          "name": { "type": "text" },
          "description": { "type": "text" },
          "timestamp": { "type": "date" }
        }
      },
      "job_posts": {
        "type": "nested",
        "properties": {
          "title": { "type": "text" },
          "description": { "type": "text" },
          "salary": { "type": "integer" },
          "tags": { "type": "keyword" }
        }
      }
    }
  }
}
