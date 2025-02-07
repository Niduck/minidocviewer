import {useState} from "react";
import {twMerge} from "tailwind-merge";
import {TreeNodeType} from "../../types/TreeNodeType.ts";

type TreeNodeProps= {
    node:TreeNodeType,
    depth: number,
    selectedFile?: null|TreeNodeType,
    onFileSelect: (node:TreeNodeType)=>void
}
export default function TreeNode({node,depth=0, selectedFile, onFileSelect}:TreeNodeProps) {

    const [open, setOpen] = useState(false)
    const handleClick = () => {
        if (node.kind === 'file') {
            onFileSelect(node);
        }
    };
    return (
        // <div className={`pl-${2*depth} flex flex-col gap-1.5`}>
        <div className={`flex flex-col gap-1.5`}>
            {node.kind === 'dir' ? (
                <div onClick={() => {
                    setOpen(!open)
                }}
                     className={twMerge('flex items-center w-full  gap-1.5 p-1.5 bg-white dark:text-white dark:bg-gray-800 rounded-md   text-gray-700 cursor-pointer hover:opacity-100 hover:font-medium  ', open && ' bg-gray-100 dark:opacity-30 text-black')}
                >
                    {depth === 0 ?(
                        <div className="flex gap-1.5 items-center">
                            {node.icon && (
                                <div className={`text-lg opacity-75 icon-${node.icon}`}></div>
                            )}

                            <div className={"uppercase text-sm font-semibold"}>{node.name}</div>
                        </div>
                    ) : (
                        <div className="flex gap-1.5 w-full  items-center">
                            {node.icon && (
                                <div className={`text-lg opacity-75 icon-${node.icon}`}></div>
                            )}
                            <div className={" text-sm grow"}>{node.name}</div>
                            {open ? (
                            <div className={`text-lg opacity-75 icon-chevron-down`}></div>
                            ): (

                                <div className={`text-lg opacity-75 icon-chevron-right`}></div>
                            )}

                        </div>

                    )}
                </div>
            ) : (
                <div onClick={handleClick}
                     className={twMerge('flex items-center hover:bg-gray-100 px-3 py-1.5 rounded-lg bg-white text-gray-600 rounded-md gap-1.5 p-1.5 cursor-pointer opacity-80 hover:opacity-100 hover:font-medium', selectedFile?.path === node?.path && 'text-black bg-gray-100 font-bold opacity-100')}>
                    {node.icon && (
                        <div className={`text-lg opacity-75 icon-${node.icon}`}></div>
                    )}
                    <div className={"text-sm w-full "}>{node.name}</div>

                </div>
            )}
            {(depth === 0 || open) && node.children && node.children.length > 0 && (
                <div className={twMerge("flex flex-col gap-1.5",
                depth > 0 && "pl-3")}>
                    {node.children.map((childNode, index) => (
                        <TreeNode depth={depth+1} key={index} node={childNode} selectedFile={selectedFile} onFileSelect={onFileSelect}/>
                    ))}
                </div>
            )}
        </div>
    );
}
