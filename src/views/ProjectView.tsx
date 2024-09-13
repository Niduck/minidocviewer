import React, {useEffect, useState} from "react";
import {Button} from "flowbite-react";
import Icon from "../components/Icon";
import {FileHandleDecorator} from "../interfaces/FileHandleStorage";
import {marked} from "marked";
import admonition from "marked-admonition-extension";
import {twMerge} from "tailwind-merge";
import mermaid from 'mermaid';
import {useLocation, useParams} from "react-router-dom";
import ProjectsIDB from "../db/ProjectsIDB";
import {Project} from "../interfaces/Project";

marked.use(admonition);
// Initialiser Mermaid
mermaid.initialize({
    startOnLoad: false, // Nous initialiserons manuellement chaque diagramme
    theme: 'neutral'
});

// Créer un renderer personnalisé pour Marked
const renderer = new marked.Renderer();

// Redéfinir la méthode code pour capturer les blocs de code Mermaid
renderer.code = (code) => {
    if (code.lang === 'mermaid') {
        // Générer un ID unique pour le diagramme
        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

        // Retourner un div avec un ID unique et le code Mermaid comme contenu
        return `<div class="mermaid" id="${uniqueId}">${code.text}</div>`;
    } else {
        // Utiliser le rendu par défaut pour les autres blocs de code
        return `<pre><code>${code.text}</code></pre>`;
    }
};
marked.setOptions({
    renderer: renderer,
    gfm: true, // Utiliser la syntaxe GitHub Flavored Markdown
    breaks: true, // Convertir les sauts de ligne en <br>
});

function Tree({data, onFileSeclected}) {
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileSelect = (file) => {
        setSelectedFile(file);
        onFileSeclected?.(file)
        // Vous pouvez également remonter cet événement à un composant parent via une prop onFileSelect
    };
    if (!data) {
        return null;
    }
    return (
        <div className={"flex flex-col gap-1.5"}>

            {data.children?.map((node, index) => (
                <TreeNode key={index} node={node} selectedFile={selectedFile} onFileSelect={handleFileSelect}/>
            ))}
        </div>
    );
}

function TreeNode({node, selectedFile, onFileSelect}) {

    const [open, setOpen] = useState(false)
    const handleClick = () => {
        if (node.kind === 'file') {
            onFileSelect(node);
        }
    };

    return (
        <div className={`${node.kind === 'dir' ? 'ml-7' : 'ml-7'}  flex flex-col gap-1.5`}>
            {node.kind === 'dir' ? (
                <div onClick={() => {
                    setOpen(!open)
                }}
                     className={twMerge('flex items-center  gap-1.5 p-1.5 bg-white rounded-md   text-gray-400 cursor-pointer hover:opacity-100 hover:font-medium ', open && 'text-black')}
                >
                    <Icon name={"folder"} size={16}></Icon>
                    <div>{node.name}</div>
                </div>
            ) : (
                <div onClick={handleClick}
                     className={twMerge('flex items-center bg-white text-gray-400 rounded-md gap-1.5 p-1.5 cursor-pointer opacity-80 hover:opacity-100 hover:font-medium', selectedFile?.path === node?.path && 'text-black font-bold opacity-100')}>
                    <Icon name={"textbook"} size={16}></Icon>
                    <div>{node.name}</div>
                </div>
            )}
            {open && node.children && node.children.length > 0 && (
                <div className={"flex flex-col gap-1.5"}>
                    {node.children.map((childNode, index) => (
                        <TreeNode key={index} node={childNode} selectedFile={selectedFile} onFileSelect={onFileSelect}/>
                    ))}
                </div>
            )}
        </div>
    );
}


function ProjectView() {

    const {state : project} = useLocation();

    //? States
    const [loading, setLoading] = useState<boolean>(false)
    const [files, setFiles] = useState<never|null>(null)
    const [selectedMarkdown, setSelectedMarkdown] = useState<string>('')
    const [selectedMarkdownAsHTML, setSelectedMarkdownAsHTML] = useState<string>('')
    const [selectedMarkdownKey, setSelectedMarkdownKey] = useState<string>('')
    const [fileHandles, setFileHandles] = useState<FileHandleDecorator[]>([])
    const [fileHandle, setFileHandle] = useState<FileHandleDecorator | null>(null)

    const params = useParams()

    //? Functions
    useEffect(()=>{
        if(files){
            setLoading(false)
        }
    },[files])
    useEffect(()=>{
        (async ()=>{
            setLoading(true)
            // let files = [];
            let prevData = null;
            for(const source of project.sources){
                console.log(source)
                const data = await walkDirectoryAsPath(source, '', prevData);
                prevData =data;
                // console.log(data)
                // files =  data;
            }
            setFiles(prevData)
        })()
    },[])
    async function walkDirectory(directoryEntry, path = '') {
        const result = {
            id: path,
            name: directoryEntry.name,
            children: [],
            kind: 'dir',
            path: path
        };

        for await (const entry of directoryEntry.values()) {
            const currentPath = `${path}/${entry.name}`;
            if (entry.kind === 'file' && entry.name.endsWith('.md')) {
                result.children.push({
                    id: currentPath,
                    kind: 'file',
                    fileHandle: entry,
                    path: currentPath,
                    name: entry.name,
                    parent: directoryEntry.name,
                });
            } else if (entry.kind === 'directory' && !['node_modules', 'vendor'].includes(entry.name)) {
                const subDirectory = await walkDirectory(entry, currentPath);
                if (subDirectory && subDirectory.children.length > 0) {
                    result.children.push(subDirectory);
                }
            }
        }
        return result;
    }

    async function walkDirectoryAsPath(directoryEntry, path = '', resultAsPath = null) {
        resultAsPath = resultAsPath ?? {
            id: path,
            name: 'Doc',
            children: [],
            kind: 'dir',
            path: path
        };
        for await (const entry of directoryEntry.values()) {
            const currentPath = `${path}/${entry.name}`;
            if (entry.kind === 'file' && entry.name.endsWith('.md')) {
                //path
                const fileContent = await entry.getFile().then(file => file.text());
                const firstLine = fileContent.split('\n')[0];  // Obtenir la première ligne

                // const regex = /<!--\[MNDW\]\{path:"(.*?)"\}-->/;
                const regex = /<!--\[MNDW\](?<json>\{.*\})-->/;
                const match = firstLine.match(regex);
                if (match) {
                    console.log(match)
                    try{
                        const json = JSON.parse(match.groups.json);
                        const customPath = json.path ? json.path : currentPath;
                        const segments = customPath.split('/');

                        // Parcourir les segments pour construire l'arborescence
                        const segmentsMap = []
                        let currentResult = resultAsPath;
                        for (let i = 0; i < segments.length; i++) {
                            const segment = segments[i];

                            let index = currentResult.children.findIndex(item => item.name === segment);
                            if (index < 0) {
                                currentResult.children.push({
                                    id: segments.slice(0, i + 1).join('/'),
                                    name: segment,
                                    children: [],
                                    kind: 'dir'
                                })
                                index = currentResult.children.length - 1;
                            }
                            segmentsMap.push(index)
                            currentResult = currentResult.children[index]
                        }

                        let current = resultAsPath;
                        for (const index of segmentsMap) {
                            current = current.children[index]
                        }
                        if(current){

                            current.children.push({
                                id: currentPath,
                                kind: 'file',
                                fileHandle: entry,
                                path: currentPath,
                                name: json.title || entry.name,
                                parent: directoryEntry.name,
                            })
                        }
                    }catch(e){
                        console.log("Malformed json", e, match)
                    }


                }
            } else if (entry.kind === 'directory' && !['node_modules', 'vendor'].includes(entry.name)) {
                await walkDirectoryAsPath(entry, currentPath, resultAsPath);
            }
        }
        return resultAsPath;
    }
    async function AskReadDirectory() {
        try {
            // Cette fonctionnalité peut ne pas être supportée dans tous les navigateurs.
            if (!window.showDirectoryPicker) {
                alert('Votre navigateur ne supporte pas l\'API File System Access.');
                return;
            }

            const directoryHandle = await window.showDirectoryPicker();
            // const newFiles = [];
            let newFiles = await walkDirectoryAsPath(directoryHandle)
            // let newFiles = await walkDirectory(directoryHandle)
            // for await (const entry of directoryHandle.values()) {
            //     if (entry.kind === 'file' && entry.name.endsWith('.md')) {
            //         // On suppose que tu veux traiter uniquement les fichiers Markdown.
            //         newFiles.push(entry.name);
            //     }
            // }
            console.log(newFiles)
            setFiles(newFiles);
        } catch (error) {
            console.error('Error accessing directory:', error);
            alert('Une erreur est survenue lors de la tentative d\'accès au dossier.');
        }
    }

    async function handleFileSelected(file) {
        const _file = await file.fileHandle.getFile();
        const contents = await _file.text();
        console.log(marked)
        const markdown = await marked(contents)
        setSelectedMarkdown(contents)
        setSelectedMarkdownAsHTML(markdown)
        setSelectedMarkdownKey(Date.now())
        setTimeout(function (){

        mermaid.init(undefined, document.querySelectorAll('.mermaid'));
        },500)
    }

    //? Template
    return (
        <>

            <header
                className="flex px-6  justify-center bg-white  w-full border-b border-gray-100 text-2xl tracking-wide font-light items-center">
                <div className="w-1/3">
                </div>
                <div className="w-1/3 flex items-center justify-center">
                    <img src={'logo.png'} className={"h-8"}/>
                    <div className={"ml-1.5 text-blue-700"}>mini<span className={"font-bold"}
                                                        style={{fontFamily: "Asap"}}>docviewer</span></div>

                </div>
                <div className="w-1/3 text-xs gap-3 items-center justify-end flex">

                </div>
            </header>

            {loading ? (

                <div className={"w-full h-full flex justify-center items-center flex-col"}>
                    <div className="bg-white text-center p-6 flex  text-blue-700 flex-col rounded-md shadow-md">
                        <div className={"font-bold text-lg"}>Please wait few seconds...</div>
                        <div className={"opacity-40"}>Scanning directories to locate <strong>.md</strong> files and organizing the summary based on <strong>[MNDW]</strong> header comments.</div>
                    </div>
                </div>

            ) : (
                <main className={"p-6 flex gap-6"}>
                    <nav className="flex w-1/4 gap-3 flex-col">
                        {files && (
                            <Tree data={files} onFileSeclected={handleFileSelected}></Tree>
                        )}
                    </nav>

                    <div className="w-3/4 h-full">
                        <section className="bg-white rounded-md shadow-sm w-full px-3 py-3">
                            <div className={"w-full markdown-body px-3 py-3"}>
                                {selectedMarkdownAsHTML && (
                                    <div dangerouslySetInnerHTML={{__html: selectedMarkdownAsHTML}}>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </main>
            )}
        </>
    )
}


export default ProjectView
