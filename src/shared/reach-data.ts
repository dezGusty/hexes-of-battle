import { Coords } from "../shared";

export class ReachData {
  constructor(
    public coords: Coords,
    public reach: number,
    public cameFrom: Coords) { }
}