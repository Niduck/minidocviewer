import {useEffect, useRef, useState} from "react";
import mermaid from 'mermaid';
import {useLocation} from "react-router-dom";
import {TreeInterface} from "../interfaces/TreeInterface";
import Tree from "./components/Tree";
import {FileHandleDecorator} from "../interfaces/FileHandleStorage";
import {Button} from "flowbite-react";
import Icon from "../components/Icon";
import {MarkedViewer} from "../components/Marked/MarkedViewer.tsx";
import {TreeNodeType} from "../types/TreeNodeType.ts";
import {HeadingType} from "../types/HeadingType.ts";


function ProjectView() {

    const {state: project} = useLocation();

    //? States
    const [loading, setLoading] = useState<boolean>(false)
    const [files, setFiles] = useState<TreeInterface | null>(null)
    const [selectedMarkdownAsHTML, setSelectedMarkdownAsHTML] = useState<string>('')
    const [headings, setHeadings] = useState<null | HeadingType[]>([])
    const [missingPermission, setMissingPermission] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [observer, setObserver] = useState<IntersectionObserver | null>(null);
    const markdownRef = useRef<HTMLDivElement>(null);

    function activateSectionObserver() {
        observer?.disconnect();
        const mbody = document.querySelectorAll(".markdown-body")[0];
        mbody.scrollTop = 0;
        const headings = mbody.querySelectorAll("h1, h2");
        setActiveId(headings[0].id)
        if (headings.length === 0) return;

        const _observer = new IntersectionObserver(
            (entries) => {

                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        console.log("Active section:", entry.target.id);
                        setActiveId(entry.target.id);
                    }
                });
            },
            {rootMargin: "100px 0px 0px 0px", threshold: 0, root: mbody}
        );

        headings.forEach((heading) => _observer.observe(heading));

        setObserver(_observer)
    }

    //? Functions
    useEffect(() => {

        if (files) {
            setLoading(false)
        }
    }, [files])
    useEffect(() => {
        (async () => {
            if (!project.sources || project.sources.length === 0) {
                console.log("Aucune source sélectionnée");
                return;
            }

            setLoading(true);
            let prevData = undefined;

            let hasAccess = true;
            for (const source of project.sources) {
                if (!source) continue;

                const granted = await ensurePermission(source);
                if (!granted) {
                    hasAccess = false;
                    continue;
                }

                const data = await walkDirectoryAsPath(source, '', prevData);
                prevData = data;
            }

            if (prevData) {
                setFiles(prevData);
            }

            setMissingPermission(!hasAccess); // Active le bouton si une permission est refusée
        })();
    }, []);

    async function requestPermissions() {
        for (const source of project.sources) {
            await source.requestPermission({mode: 'read'}); // Doit être dans un événement utilisateur
        }
        setMissingPermission(false); // Cacher le bouton après autorisation
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
        const permission = await dirHandle.queryPermission({mode: 'read'});
        return permission === 'granted';
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

    async function handleFileSelected(file: FileHandleDecorator) {
        const _file = await file.fileHandle.getFile();
        const contents = await _file.text();
        // const markdown = await marked(contents)
        setSelectedMarkdownAsHTML(contents)
        const headings = extractHeadings(contents);
        setHeadings(headings);


        setTimeout(function () {
            mermaid.init(undefined, document.querySelectorAll('.mermaid'));
            activateSectionObserver();
        }, 500)
    }

    function extractHeadings(markdown: string): null | HeadingType[] {
        const lines = markdown.split("\n");
        const headings = lines
            .map(line => {
                console.log(line)
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
                <div className="w-1/3 flex items-center justify-center">
                    <div className="text-lg">
                        {project.name}
                    </div>
                </div>
                <div className="w-1/3 text-xs gap-3 items-center justify-end flex"></div>
            </header>

            {missingPermission ? (
                <button onClick={requestPermissions}>
                    🔓 Autoriser l’accès aux fichiers
                </button>
            ) : (<>
                {loading ? (

                    <div className={"w-full h-full flex justify-center items-center flex-col"}>
                        <div
                            className="bg-white dark:bg-gray-800 text-center p-6 flex  text-black flex-col rounded-md shadow-md">
                            <div className={"font-bold text-lg"}>Please wait few seconds...</div>
                            <div className={"opacity-40"}>Scanning directories to locate <strong>.md</strong> files and
                                organizing the summary based on <strong>[MNDW]</strong> header comments.
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
                            <div className="w-fit shrink-0 m-auto">
                                <Button onClick={print} color={"light"}>
                                    <Icon name={"print"} size={16}/></Button>
                            </div>
                            <div className="flex grow py-3  flex-col border-t">

                                <h2 className={"text-center opacity-75 text-sm font-bold uppercase"}>Table of
                                    contents</h2>
                                {headings && (
                                    <div className="flex flex-col py-3 gap-3 px-6">
                                        {headings.map(heading => (
                                            <a onClick={(e) => {
                                                e.preventDefault(); // Évite le scroll global
                                                scrollToSection(heading.id); // Scroll le markdown uniquement
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

        </>
    )
}


export default ProjectView
