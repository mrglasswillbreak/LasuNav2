import Dexie, { type Table } from "dexie";

export type LocationCategory = "Lecture Theatre" | "Admin" | "Gate" | "Cafe" | "Faculty" | "Hall";

export interface CampusLocation {
  id: string;
  name: string;
  acronym: string;
  faculty: string;
  latitude: number;
  longitude: number;
  description: string;
  category: LocationCategory;
}

export interface RoutingGraph {
  id: string;
  nodes: GeoJSON.LineString;
  version: number;
}

class CampusDatabase extends Dexie {
  locations!: Table<CampusLocation, string>;
  routing_graph!: Table<RoutingGraph, string>;

  constructor() {
    super("lasu_campus_navigator");
    this.version(1).stores({
      locations: "id, name, acronym, faculty, category",
      routing_graph: "id, version"
    });
  }
}

export const campusDb = new CampusDatabase();

export const seedLocations: CampusLocation[] = [
  { id: "senate-building", name: "Senate Building", acronym: "SEN", faculty: "Central Administration", latitude: 6.46518, longitude: 3.19942, description: "Main administrative block of Lagos State University.", category: "Admin" },
  { id: "faculty-of-science", name: "Faculty of Science", acronym: "FOS", faculty: "Science", latitude: 6.46617, longitude: 3.20108, description: "Faculty complex for science departments and laboratories.", category: "Faculty" },
  { id: "faculty-management-sciences", name: "Faculty of Management Sciences", acronym: "FMS", faculty: "Management Sciences", latitude: 6.46463, longitude: 3.20241, description: "Home of accounting, banking, business administration and related departments.", category: "Faculty" },
  { id: "badagry-gate", name: "Badagry Gate", acronym: "BG", faculty: "Campus Access", latitude: 6.46292, longitude: 3.19843, description: "Major entry and exit point toward the Badagry expressway axis.", category: "Gate" },
  { id: "mba-hall", name: "MBA Hall", acronym: "MBA", faculty: "Postgraduate Studies", latitude: 6.46559, longitude: 3.20322, description: "Lecture and event hall commonly used by postgraduate students.", category: "Hall" },
  { id: "students-arcade-cafe", name: "Students Arcade Cafe", acronym: "SAC", faculty: "Student Services", latitude: 6.46399, longitude: 3.20062, description: "Food and refreshment area near student activity corridors.", category: "Cafe" }
];

export const seedRoutingGraph: RoutingGraph = {
  id: "lasu-main-walkways",
  version: 1,
  nodes: {
    type: "LineString",
    coordinates: [[3.19843, 6.46292], [3.19942, 6.46518], [3.20062, 6.46399], [3.20108, 6.46617], [3.20241, 6.46463], [3.20322, 6.46559]]
  }
};

export async function seedCampusDb() {
  const [locationCount, graphCount] = await Promise.all([campusDb.locations.count(), campusDb.routing_graph.count()]);
  if (locationCount === 0) await campusDb.locations.bulkPut(seedLocations);
  if (graphCount === 0) await campusDb.routing_graph.put(seedRoutingGraph);
}

export async function searchLocations(query: string): Promise<CampusLocation[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return campusDb.locations.limit(12).toArray();
  const allLocations = await campusDb.locations.toArray();
  return allLocations
    .map((location) => {
      const searchable = [location.name, location.acronym, location.faculty, location.category].join(" ").toLowerCase();
      const exactAcronym = location.acronym.toLowerCase() === normalized;
      const directMatch = searchable.includes(normalized);
      const fuzzyScore = scoreFuzzyMatch(normalized, searchable);
      return { location, score: exactAcronym ? 100 : directMatch ? 80 : fuzzyScore };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.location);
}

function scoreFuzzyMatch(query: string, target: string): number {
  let queryIndex = 0;
  let score = 0;
  for (let targetIndex = 0; targetIndex < target.length; targetIndex += 1) {
    if (target[targetIndex] === query[queryIndex]) {
      score += 4;
      queryIndex += 1;
    }
    if (queryIndex === query.length) return score - targetIndex * 0.05;
  }
  return 0;
}
