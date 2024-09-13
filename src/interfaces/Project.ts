import {FileHandleDecorator} from "./FileHandleStorage";

export interface Project {
    name: string,
    sources: FileHandleDecorator[]
}
