export function unique(arr: any[]): any[] {
  return arr.filter((elem, pos, arr) => arr.indexOf(elem) === pos)
}
export function toArray(inp: any | any[]): any[] {
  return Array.isArray(inp) ? inp : inp === undefined ? [] : [inp]
}
export function concatUnique(arr1: any | [], ...args: any | any[]): any[] {
  args = args.map((a: any) => toArray(a))
  return unique(toArray(arr1).concat(...args))
}
export const arraySample = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]