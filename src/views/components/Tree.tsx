import  {useState} from "react";
import {TreeInterface} from "src/interfaces/TreeInterface";
import TreeNode from "./TreeNode";

export default function Tree({data, onFileSelected}: {data: TreeInterface, onFileSelected:(file:never)=>void}) {
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileSelect = (file:never) => {
        setSelectedFile(file);
        onFileSelected?.(file)
    };
    if (!data) {
        return null;
    }
    return (
        <div className={"flex flex-col border-r px-6 py-3 h-full gap-1.5"}>
            {data.children?.map((node, index) => (
                <TreeNode key={index} node={node} selectedFile={selectedFile} onFileSelect={handleFileSelect}/>
            ))}
        </div>
    );
}
