export interface TreeNodeType {
    id: string,
    name: string,
    icon?:string|null,
    children: TreeNodeType[],
    fileHandle?: FileSystemFileHandle,
    kind?: string,
    parent?: string,
    path?: string
}
