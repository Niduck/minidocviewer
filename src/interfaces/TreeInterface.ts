export interface TreeInterface{
    id: string,
    name: string,
    children: TreeInterface[],
    fileHandle?: FileSystemFileHandle,
    kind?: string,
    parent?: string,
    path?: string
}
