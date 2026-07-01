export interface TimelineParameters {
  durationHours: number;
  cascadingIntervalHours: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  disasterType: string;
  disasterSubtype: string;
  country: string;
  iso: string;
  region: string;
  magnitude: number;
  magnitudeScale: string;
  timelineParameters: TimelineParameters;
  notes: string;
  tags: string[];
  status: "Draft" | "Published";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioCreateInput {
  name: string;
  description?: string;
  disasterType: string;
  disasterSubtype?: string;
  country: string;
  iso: string;
  region?: string;
  magnitude: number;
  magnitudeScale: string;
  timelineParameters?: TimelineParameters;
  notes?: string;
  tags?: string[];
  status?: "Draft" | "Published";
}

export interface ScenarioUpdateInput {
  name?: string;
  description?: string;
  disasterType?: string;
  disasterSubtype?: string;
  country?: string;
  iso?: string;
  region?: string;
  magnitude?: number;
  magnitudeScale?: string;
  timelineParameters?: TimelineParameters;
  notes?: string;
  tags?: string[];
  status?: "Draft" | "Published";
}

export interface ScenarioListResponse {
  totalCount: number;
  page: number;
  totalPages: number;
  data: Scenario[];
}
