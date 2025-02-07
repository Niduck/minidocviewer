import {useEffect, useState} from "react";
import ProjectModal from "./components/ProjectModal";
import ProjectsIDB from "../db/ProjectsIDB";
import {Project} from "../interfaces/Project";
import {Link} from "react-router-dom";
import {Button} from "flowbite-react";
import noop from "../utils/noop.ts";

function IndexView() {
    const [projectModalOpen, setProjectModalOpen] = useState(false)
    const [projectModalData, setProjectModalData] = useState<Project | null>(null)
    const [projects, setProjects] = useState<Project[]>([])

    //? Hooks : Effects
    useEffect(() => {
        loadProjects().then(noop);

    }, [])

    async function loadProjects() {
        const projectsIDB = await ProjectsIDB;
        const projects = await projectsIDB.all() as Project[];
        setProjects(projects)
    }

    useEffect(() => {
        setProjectModalOpen(!!projectModalData)
    }, [projectModalData])
    //? Template
    return (
        <>
            <header
                className="flex px-6  justify-center bg-white dark:bg-gray-900  w-full border-b border-gray-100 text-2xl tracking-wide font-light items-center">
                <div className="w-1/3"></div>
                <div className="w-1/3 flex items-center text-black dark:text-white justify-center">
                    <div className={"ml-1.5"}>mini<span className={"font-bold"}
                                                        style={{fontFamily: "Asap"}}>docviewer</span></div>
                </div>
                <div className="w-1/3 text-xs gap-3 items-center justify-end flex"></div>
            </header>
            <main className={"p-6 flex gap-6"}>
                <div className="mx-auto border rounded-xl w-2/ h-fit py-3 bg-white justify-start flex flex-col">
                    <div onClick={() => {
                        setProjectModalOpen(true)
                    }}
                         className="opacity-40 gap-1.5 w-full hover:opacity-100 select-none transition-all cursor-pointer flex flex-col p-6 py-12 font-bold text-black border-blue-100 justify-center bg-white rounded-md">
                        <div className="flex items-center gap-6">
                            <div className="icon text-xl icon-circle-plus"></div>
                            <div className="flex flex-col">
                                Create a new projet
                                <div className="font-light opacity-75">
                                    A projet can agregate multiple documentation sources
                                </div>
                            </div>
                        </div>
                    </div>
                    {projects.map(project => (
                        <Link key={project.id} to={'/reader'} state={project}
                              className=" border-t gap-1.5 w-full select-none transition-all cursor-pointer flex flex-col p-6 font-bold   justify-center  bg-white  dark:bg-gray-600">

                            <div className="flex items-center gap-6">
                                <div className="flex w-full flex-col">
                                    <div className="text-xl">
                                        {project.name}
                                    </div>
                                    <div className="font-light text-sm opacity-60">
                                        [{project.sources.map((source, index) => (<>{source.name}{index < project.sources.length - 1 && ', '}</>))}]
                                    </div>
                                </div>
                                <Button size={"xs"} onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setProjectModalData(project)
                                }}>

                                    <div className="icon text-base icon-pencil"></div>
                                </Button>
                            </div>
                        </Link>
                    ))}
                </div>
            </main>
            <ProjectModal isOpen={projectModalOpen} defaultValue={projectModalData} onClose={() => {
                loadProjects().then(noop)
                setProjectModalOpen(false)
            }}/>
        </>
    )
}


export default IndexView
