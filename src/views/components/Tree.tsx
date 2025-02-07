import  {useState} from "react";
import TreeNode from "./TreeNode";
import {TreeNodeType} from "../../types/TreeNodeType.ts";

export default function Tree({data, onFileSelected}: {data: TreeNodeType, onFileSelected:(file:TreeNodeType)=>void}) {
    const [selectedFile, setSelectedFile] = useState<TreeNodeType|null>(null);

    const handleFileSelect = (file:TreeNodeType) => {
        setSelectedFile(file);
        onFileSelected?.(file)
    };
    if (!data) {
        return null;
    }
    return (
        <div className={"flex flex-col px-6 py-3 h-full gap-1.5"}>
            {data.children?.map((node:TreeNodeType, index:number) => (
                <TreeNode depth={0} key={index} node={node} selectedFile={selectedFile} onFileSelect={handleFileSelect}/>
            ))}
        </div>
    );
}
