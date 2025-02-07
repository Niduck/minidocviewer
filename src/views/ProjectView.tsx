import {useEffect, useRef, useState} from "react";
import {Link, useLocation} from "react-router-dom";
import {TreeInterface} from "../interfaces/TreeInterface";
import Tree from "./components/Tree";
import {Button} from "flowbite-react";
import {MarkedViewer} from "../components/Marked/MarkedViewer.tsx";
import {TreeNodeType} from "../types/TreeNodeType.ts";
import {HeadingType} from "../types/HeadingType.ts";
import MarkdownEditorModal from "./components/MarkdownEditorModal.tsx";
import noop from "../utils/noop.ts";


function ProjectView() {

    const {state: project} = useLocation();

    //? States
    const [loading, setLoading] = useState<boolean>(false)
    const [files, setFiles] = useState<TreeInterface | null>(null)
    const [selectedFile, setSelectedFile] = useState<TreeNodeType | null>(null)
    const [selectedMarkdownAsHTML, setSelectedMarkdownAsHTML] = useState<string>('')
    const [headings, setHeadings] = useState<null | HeadingType[]>([])
    const [missingPermission, setMissingPermission] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [markdownModalOpen, setMarkdownModalOpen] = useState(false)
    const [markdownModalData, setMarkdownModalData] = useState<TreeNodeType | null>(null)
    const markdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMarkdownModalOpen(!!markdownModalData)
    }, [markdownModalData])
    //? Functions
    useEffect(() => {

        if (files) {
            setLoading(false)
        }
    }, [files])
    useEffect(() => {
        loadProject().then(noop)
    }, []);

    async function loadProject() {
        if (!project.sources || project.sources.length === 0) {
            console.log("Aucune source sélectionnée");
            return;
        }

        setLoading(true);
        let prevData = undefined;

        let hasAccess = true;
        for (const source of project.sources) {
            if (!source) continue;

            const permission = await ensurePermission(source);
            if (permission !== 'granted') {
                hasAccess = false;
                continue;
            }

            prevData = await walkDirectoryAsPath(source, '', prevData);
        }

        if (prevData) {
            setFiles(prevData);
        }

        setMissingPermission(!hasAccess);
    }

    async function requestPermissions() {
        for (const source of project.sources) {

            await source.requestPermission({mode: 'readwrite'});
        }
        loadProject().then(noop)
        setMissingPermission(false);
    }

    function scrollToSection(id: string) {
        const target = document.getElementById(id);
        const container = markdownRef.current; // Récupère le conteneur scrollable
        setActiveId(id)
        if (target && container) {
            container.scrollTo({
                top: target.offsetTop - container.offsetTop, // Ajustement pour bien centrer
                behavior: "smooth",
            });
        }
    }

    async function ensurePermission(dirHandle: FileSystemDirectoryHandle) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return await dirHandle.queryPermission({mode: 'readwrite'});
    }

    async function walkDirectoryAsPath(directoryEntry: FileSystemDirectoryHandle, path: string = '', resultAsPath: TreeNodeType = {
        id: path,
        name: 'Doc',
        children: [],
        kind: 'dir',
        path: path
    }) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        for await (const entry of directoryEntry.values()) {
            const currentPath = `${path}/${entry.name}`;
            if (entry.kind === 'file' && entry.name.endsWith('.md')) {
                //path
                const fileContent = await entry.getFile().then((file: File) => file.text());
                const firstLine = fileContent.split('\n')[0];  // Obtenir la première ligne

                const regex = /<!--\[MNDW\](?<json>\{.*\})-->/;
                const match = firstLine.match(regex);
                if (match) {
                    try {
                        const json = JSON.parse(match.groups.json);
                        const customPath = json.path ? json.path : currentPath;
                        const segments = customPath.split('/');

                        const segmentsMap = []
                        let currentResult = resultAsPath;
                        for (let i = 0; i < segments.length; i++) {
                            const segment = segments[i];
                            const [icon = null, name] = segment.includes('::') ? segment.split('::') : [null, segment];
                            let index = currentResult.children.findIndex(item => item.name === name);

                            if (index < 0) {
                                currentResult.children.push({
                                    id: segments.slice(0, i + 1).join('/'),
                                    name: name,
                                    icon: icon,
                                    children: [],
                                    kind: 'dir'
                                })
                                index = currentResult.children.length - 1;
                            }
                            const data = currentResult.children[index];
                            data.icon = icon;
                            currentResult.children[index] = data;
                            segmentsMap.push(index)
                            currentResult = currentResult.children[index]
                        }

                        let current = resultAsPath;
                        for (const index of segmentsMap) {
                            current = current.children[index]
                        }
                        if (current) {
                            const fileName = json.title || entry.name
                            const [icon = null, name] = fileName.includes('::') ? fileName.split('::') : [null, fileName];

                            current.children.push({
                                id: currentPath,
                                kind: 'file',
                                fileHandle: entry as FileSystemFileHandle,
                                path: currentPath,
                                icon: icon,
                                name: name,
                                parent: directoryEntry.name,
                            } as TreeNodeType)
                        }
                    } catch (e) {
                        console.log("Malformed json", e, match)
                    }


                }
            } else if (entry.kind === 'directory' && !['node_modules', 'vendor'].includes(entry.name)) {
                await walkDirectoryAsPath(entry, currentPath, resultAsPath);
            }
        }
        return resultAsPath;
    }

    function convertSvgToPng(svgElement: SVGSVGElement): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            if (!svgElement) return reject("SVG Element is null");

            const width = svgElement.viewBox.baseVal.width || svgElement.getBBox().width;
            const height = svgElement.viewBox.baseVal.height || svgElement.getBBox().height;

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject("Impossible d'obtenir le contexte 2D");

            const svgData = new XMLSerializer().serializeToString(svgElement);
            const img = new Image();
            img.crossOrigin = "anonymous"; // Évite les problèmes CORS

            img.onload = () => {
                ctx.drawImage(img, 0, 0, width, height);
                const pngDataUrl = canvas.toDataURL("image/png");

                const pngImage = new Image();
                pngImage.src = pngDataUrl;
                pngImage.alt = "Diagramme converti en PNG";

                resolve(pngImage);
            };

            img.onerror = (e) => reject(e);
            img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
        });
    }

    function print(): void {
        // Ouvrir tous les éléments `<details>`
        document.querySelectorAll("details").forEach((item) => item.setAttribute("open", "open"));

        // Convertir tous les diagrammes Mermaid en PNG
        const diagrams = Array.from(document.getElementsByClassName("mermaid"));
        const promises: Promise<void>[] = diagrams.map(async (diagram) => {
            if (!(diagram instanceof HTMLElement) || !diagram.firstChild) return;

            const svgElement = diagram.firstChild as SVGSVGElement;
            if (svgElement.style.display === "none") return;

            try {
                const pngImage = await convertSvgToPng(svgElement);
                diagram.appendChild(pngImage);
                svgElement.style.display = "none"; // Masquer l'ancien SVG
            } catch (error) {
                console.error("Erreur lors de la conversion SVG → PNG :", error);
            }
        });

        // Attendre la conversion des images avant d'imprimer
        Promise.all(promises).then(() => {
            setTimeout(() => window.print(), 500);
        });
    }

    async function handleFileSelected(file: TreeNodeType) {
        const _file = await file.fileHandle?.getFile();
        setSelectedFile(file)
        if (!_file) {
            return;
        }
        const contents = await _file.text();
        // const markdown = await marked(contents)
        setSelectedMarkdownAsHTML(contents)
        const headings = extractHeadings(contents);
        setHeadings(headings);
    }

    function extractHeadings(markdown: string): null | HeadingType[] {
        const lines = markdown.split("\n");
        const headings = lines
            .map(line => {
                const match = line.match(/^(#{1,2})\s+(.*)/); // Regex pour détecter les titres Markdown
                if (!match) return null;
                return {
                    level: match[1].length,
                    text: match[2],
                    id: match[2].toLowerCase().replace(/\s+/g, "-")
                } as HeadingType;
            })
            .filter(Boolean);
        return headings as HeadingType[];
    }

    //? Template
    return (
        <>

            <header
                className="flex px-6 shrink-0  justify-center bg-white dark:bg-gray-800  w-full border-b  text-2xl tracking-wide font-light items-center">
                <div className="w-1/3">
                    <div className={"ml-1.5 dark:text-white"}>mini<span className={"font-bold"}
                                                                        style={{fontFamily: "Asap"}}>docviewer</span>
                    </div>
                </div>
                <div className="w-1/3 flex gap-3 items-center relative justify-center">


                    <div className="text-lg">
                        {project.name}
                    </div>
                </div>
                <div className="w-1/3 text-xs gap-3 items-center justify-end flex">
                    <Link to={"/"}
                          className={"border flex gap-1.5 left-0 font-normal opacity-50 hover:opacity-100 rounded-md py-1.5 px-3 text-sm cursor-pointer hover:bg-gray-100"}>
                        <div className={"icon icon-arrow-left"}/>
                        Back to projects
                    </Link>
                </div>
            </header>

            {missingPermission ? (
                <div className="h-full w-full gap-3  flex-col bg-white flex items-center justify-center">
                    <div className="flex flex-col w-1/3 gap-3 p-6 justify-center items-center bg-gray-100 rounded-xl">
                        <div className="icon text-3xl icon-user-check"></div>
                        <div className="flex flex-col text-center gap-1  text-base">
                            <p>
                                Minidoc needs permission to access your documentation folder to display, edit, and
                                organize your
                                Markdown files. Without these permissions, we cannot load your documentation or save
                                your changes.
                            </p>

                        </div>
                        <Button onClick={requestPermissions}>Authorize</Button>
                        <p className="flex  p-3  flex-col text-center gap-1 opacity-60 text-sm">
                            If this message persists, it means that at least one of the selected sources has been
                            explicitly denied access. This prevents us from displaying or modifying your files. Please
                            check your browser settings to allow file access and try again, or remove the denied folder
                            from the sources.
                        </p>
                    </div>

                </div>
            ) : (<>
                {loading ? (

                    <div className={"w-full h-full bg-white flex justify-center items-center flex-col"}>
                        <div className="flex flex-col gap-3 p-6 justify-center items-center bg-gray-100 rounded-xl">
                            <div className="icon text-3xl icon-loader-circle animate-spin"></div>
                            <div className="flex flex-col text-center gap-1 opacity-60 text-sm">
                                <p>
                                    Minidoc is scanning your documentation files.
                                </p>
                                <p>
                                    This may take a few moments depending on the number of files.
                                </p>
                                <p>
                                    Please wait...
                                </p>
                            </div>
                        </div>
                    </div>

                ) : (
                    <main className={"print:w-full grow  flex -6"}>
                        <nav
                            className="flex shrink-0 w-64 dark:bg-gray-800 bg-white border-r  dark:border-gray-600 print:hidden gap-3 flex-col">
                            {files && (
                                <Tree data={files} onFileSelected={handleFileSelected}></Tree>
                            )}
                        </nav>

                        <div className="grow bg-white print:w-full h-full">
                            <div className="flex h-full flex-col gap-1.5">
                                <section className=" printable h-full px-3  w-full  screen:py-3">
                                    <div ref={markdownRef} className={"w-full markdown-body h-full px-3 py-3"}>
                                        {selectedMarkdownAsHTML && (
                                            <MarkedViewer markdown={selectedMarkdownAsHTML}></MarkedViewer>
                                            // <div dangerouslySetInnerHTML={{__html: selectedMarkdownAsHTML}}>
                                            // </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </div>
                        <nav className="flex shrink-0 w-80 border-l bg-white py-6 print:hidden gap-3 flex-col">
                            <div className="w-fit flex gap-3 shrink-0 m-auto">
                                <Button title="Print" onClick={print} color={"light"}>
                                    <div className="icon text-sm icon-printer"></div>
                                </Button>
                                <Button title="Edit markdown" onClick={() => {
                                    setMarkdownModalData(selectedFile)
                                }} color={"light"}>
                                    <div className="icon text-sm icon-square-pen"></div>
                                </Button>
                            </div>
                            <div className="flex grow py-3  flex-col border-t">

                                <h2 className={"text-center opacity-75 text-sm font-bold uppercase"}>Table of
                                    contents</h2>
                                {headings && (
                                    <div className="flex flex-col py-3 gap-3 px-6">
                                        {headings.map((heading, index) => (
                                            <a key={index} onClick={(e) => {
                                                e.preventDefault();
                                                scrollToSection(heading.id);
                                            }}
                                               className={`text-sm px-3 ${activeId === heading.id && "border-l-2 font-bold border-blue-400"}`}
                                               href={'#' + heading.id}>{heading.text}</a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </nav>
                    </main>
                )}
            </>)}
            <MarkdownEditorModal isOpen={markdownModalOpen} defaultValue={markdownModalData} onClose={() => {
                setMarkdownModalData(null)
            }}/>
        </>
    )
}


export default ProjectView
