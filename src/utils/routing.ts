import * as turf from "@turf/turf";
import type { CampusLocation, RoutingGraph } from "@/db/campusDb";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  bearing: number;
  from: Coordinate;
  to: Coordinate;
}

export interface CalculatedRoute {
  distanceMeters: number;
  path: Coordinate[];
  steps: RouteStep[];
}

interface GraphNode {
  id: string;
  coordinate: Coordinate;
}

type AdjacencyList = Map<string, Array<{ nodeId: string; weight: number }>>;

export function calculateRoute(start: Coordinate, destination: CampusLocation, routingGraph: RoutingGraph): CalculatedRoute {
  const graphNodes = buildGraphNodes(routingGraph);
  const adjacency = buildAdjacencyList(graphNodes);
  const startNearest = findNearestNode(start, graphNodes);
  const destinationNearest = findNearestNode({ latitude: destination.latitude, longitude: destination.longitude }, graphNodes);
  const graphPath = dijkstra(startNearest.node.id, destinationNearest.node.id, graphNodes, adjacency);
  const path = [start, ...graphPath.map((node) => node.coordinate), { latitude: destination.latitude, longitude: destination.longitude }];
  const steps = buildRouteSteps(path);
  return { distanceMeters: steps.reduce((total, step) => total + step.distanceMeters, 0), path, steps };
}

function buildGraphNodes(routingGraph: RoutingGraph): GraphNode[] {
  return routingGraph.nodes.coordinates.map(([longitude, latitude], index) => ({ id: `node-${index}`, coordinate: { latitude, longitude } }));
}

function buildAdjacencyList(nodes: GraphNode[]): AdjacencyList {
  const adjacency: AdjacencyList = new Map();
  for (const node of nodes) adjacency.set(node.id, []);
  for (let index = 0; index < nodes.length - 1; index += 1) {
    const current = nodes[index];
    const next = nodes[index + 1];
    const weight = distanceMeters(current.coordinate, next.coordinate);
    adjacency.get(current.id)?.push({ nodeId: next.id, weight });
    adjacency.get(next.id)?.push({ nodeId: current.id, weight });
  }
  return adjacency;
}

function findNearestNode(coordinate: Coordinate, nodes: GraphNode[]): { node: GraphNode; distanceMeters: number } {
  if (nodes.length === 0) throw new Error("Routing graph has no nodes.");
  return nodes.reduce(
    (nearest, node) => {
      const distance = distanceMeters(coordinate, node.coordinate);
      return distance < nearest.distanceMeters ? { node, distanceMeters: distance } : nearest;
    },
    { node: nodes[0], distanceMeters: distanceMeters(coordinate, nodes[0].coordinate) }
  );
}

function dijkstra(startNodeId: string, endNodeId: string, nodes: GraphNode[], adjacency: AdjacencyList): GraphNode[] {
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();
  for (const node of nodes) {
    distances.set(node.id, Number.POSITIVE_INFINITY);
    previous.set(node.id, null);
    unvisited.add(node.id);
  }
  distances.set(startNodeId, 0);

  while (unvisited.size > 0) {
    const currentNodeId = Array.from(unvisited).reduce((closest, nodeId) =>
      (distances.get(nodeId) ?? Number.POSITIVE_INFINITY) < (distances.get(closest) ?? Number.POSITIVE_INFINITY) ? nodeId : closest
    );
    if (currentNodeId === endNodeId) break;
    unvisited.delete(currentNodeId);
    for (const neighbor of adjacency.get(currentNodeId) ?? []) {
      if (!unvisited.has(neighbor.nodeId)) continue;
      const candidateDistance = (distances.get(currentNodeId) ?? Number.POSITIVE_INFINITY) + neighbor.weight;
      if (candidateDistance < (distances.get(neighbor.nodeId) ?? Number.POSITIVE_INFINITY)) {
        distances.set(neighbor.nodeId, candidateDistance);
        previous.set(neighbor.nodeId, currentNodeId);
      }
    }
  }

  const pathIds: string[] = [];
  let current: string | null = endNodeId;
  while (current) {
    pathIds.unshift(current);
    current = previous.get(current) ?? null;
  }
  if (pathIds[0] !== startNodeId) throw new Error("No route found between the selected campus points.");
  return pathIds.map((id) => {
    const node = nodes.find((candidate) => candidate.id === id);
    if (!node) throw new Error(`Routing graph node ${id} is missing.`);
    return node;
  });
}

function buildRouteSteps(path: Coordinate[]): RouteStep[] {
  return path.slice(0, -1).map((from, index) => {
    const to = path[index + 1];
    const distance = distanceMeters(from, to);
    const bearing = bearingDegrees(from, to);
    return { from, to, distanceMeters: distance, bearing, instruction: `Walk ${Math.round(distance)}m ${bearingToCompass(bearing)}` };
  });
}

export function distanceMeters(from: Coordinate, to: Coordinate): number {
  return turf.distance(turf.point([from.longitude, from.latitude]), turf.point([to.longitude, to.latitude]), { units: "kilometers" }) * 1000;
}

function bearingDegrees(from: Coordinate, to: Coordinate): number {
  return (turf.bearing(turf.point([from.longitude, from.latitude]), turf.point([to.longitude, to.latitude])) + 360) % 360;
}

function bearingToCompass(bearing: number): string {
  const directions = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];
  return directions[Math.round(bearing / 45) % 8];
}
