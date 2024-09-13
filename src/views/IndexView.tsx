import {Button} from "flowbite-react";
import {useEffect, useState} from "react";
import ProjectModal from "./components/ProjectModal";
import ProjectsIDB from "../db/ProjectsIDB";
import {Project} from "../interfaces/Project";
import {Link, useNavigate} from "react-router-dom";

function IndexView() {
    const [projectModalOpen, setProjectModalOpen] = useState(false)
    const [projects, setProjects] = useState<Project[]>([])

    const navigate = useNavigate();
    //? Hooks : Effects
    useEffect(() => {
        (async () => {
            const projectsIDB = await ProjectsIDB;
            const projects = await projectsIDB.all() as Project[];
            setProjects(projects)
        })()

    }, [])
    //? Template
    return (
        <>

            <header
                className="flex px-6  justify-center bg-white  w-full border-b border-gray-100 text-2xl tracking-wide font-light items-center">
                <div className="w-1/3">
                </div>
                <div className="w-1/3 flex items-center text-blue-700 justify-center">
                    <img src={'logo.png'} className={"h-8"}/>
                    <div className={"ml-1.5"}>mini<span className={"font-bold"}
                                                        style={{fontFamily: "Asap"}}>docviewer</span></div>

                </div>
                <div className="w-1/3 text-xs gap-3 items-center justify-end flex">

                </div>
            </header>
            <main className={"p-6 flex gap-6"}>

                <div className="m-auto w-2/4 justify-center gap-6 items-center flex flex-col">
                    <div onClick={() => {
                        setProjectModalOpen(true)
                    }} className="hover:scale-105 opacity-60 gap-1.5 w-full hover:opacity-100 select-none transition-all cursor-pointer flex flex-col p-6 py-12 font-bold text-blue-700 border-blue-100 justify-center text-center bg-white rounded-md border w-fit h-fit  flex-col">
                        Create a new projet
                        <div className="font-light text-blue-400">
                            A projet can agregate multiple documentation sources
                        </div>
                    </div>
                    {projects.map(project => (
                        <Link to={'/reader'} state={project} className="hover:scale-105 gap-1.5 w-full select-none transition-all cursor-pointer flex flex-col p-6 font-bold   justify-center text-center bg-white rounded-md border w-fit h-fit  flex-col">
                            <div className="text-xl">
                                {project.name}
                            </div>
                            <div className="font-light text-sm opacity-60">
                                [{project.sources.map((source,index) => (<>{source.name}{index < project.sources.length-1 && ', '}</>))}]
                            </div>
                        </Link>
                    ))}


                </div>
            </main>
            <ProjectModal isOpen={projectModalOpen} onClose={(data)=>{
                setProjects(prevState => [...prevState, data])
                setProjectModalOpen(false)
            }}/>
        </>
    )
}


export default IndexView
