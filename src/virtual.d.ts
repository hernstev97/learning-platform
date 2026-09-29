declare module 'virtual:catalog' {
  const catalog: import('./content/types.ts').Catalog;
  export default catalog;
}
declare module 'virtual:area-loaders' {
  const loaders: Record<string, () => Promise<{ default: import('./content/types.ts').Area }>>;
  export default loaders;
}
declare module 'virtual:search-index' {
  const docs: import('./content/types.ts').SearchDoc[];
  export default docs;
}
declare module '*.py?raw' {
  const source: string;
  export default source;
}
