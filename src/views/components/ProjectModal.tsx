import {Button, Label, Modal, Textarea, TextInput, Tooltip} from "flowbite-react";
import {Project} from "../../interfaces/Project";
import {useEffect, useRef, useState} from "react";
import uniqid from 'uniqid';
import ProjectsIDB from "../../db/ProjectsIDB";
import {FileHandleDecorator} from "../../interfaces/FileHandleStorage";

function ProjectModal({
                          isOpen,
                          onClose,
                          defaultValue
                      }: { isOpen: boolean, onClose: (data?: Project) => void, defaultValue?: Project | null }) {

    const [formData, setFormData] = useState(defaultValue || {name: "My super project", sources: []})
    const formRef = useRef(null)

    function _onClose(data?:Project) {
        onClose?.(data)
    }

    async function AskReadDirectory() {
        try {

            // Cette fonctionnalité peut ne pas être supportée dans tous les navigateurs.
            if (!window.showDirectoryPicker) {
                alert('Votre navigateur ne supporte pas l\'API File System Access.');
                return;
            }
            const directoryHandle = await window.showDirectoryPicker();
            setFormData(prevState => {
                return {...prevState, sources: [...prevState.sources, directoryHandle]};
            })

        } catch (error) {
            console.error('Error accessing directory:', error);
            alert('Une erreur est survenue lors de la tentative d\'accès au dossier.');
        }
    }

    function removeSource(source:FileSystemFileHandle){
        const newData  = formData.sources;
        const index = newData.findIndex(item=> item === source);
        if(index > -1){
            newData.splice(index,1);
        }
        setFormData(prevState => {
            return {...prevState, sources: [...newData]};
        })
    }

    async function handleSave() {
        const id = defaultValue?.id || uniqid.time();

        //-- Save data in indexedDB
        const idb = await ProjectsIDB
        if (defaultValue?.id) {
            //it's an edit
            idb.update(id, {id, ...formData})
        } else {
            idb.add(id, {id, ...formData})
        }
        _onClose(formData);
    }

    return (
        <>
            <Modal size={"4xl"} show={isOpen} onClose={_onClose}>
                <Modal.Header>{
                    defaultValue ? "Edit project" : "New project"
                }</Modal.Header>
                <Modal.Body>
                    <form ref={formRef} autoComplete={"off"} className="flex flex-col w-full items-stretch gap-3">
                        <div>
                            <div className="mb-2 block">
                                <Label htmlFor="name" value="Name"/>
                            </div>
                            <TextInput autoComplete={"off"} name="name" value={formData.name} onChange={(e) => {
                                setFormData(prevState => {
                                    return {
                                        ...prevState,
                                        name: e.target.value
                                    }
                                })
                            }} id="name" type="text" placeholder="My super project" required/>
                        </div>
                        <div>
                            <div className="mb-3 flex flex-col  block">
                                <Label htmlFor="sources" value="Sources"/>
                                <Label value={"You can add multiple sources"} className={"opacity-60 text-xs"}></Label>
                            </div>
                            <Button color="light" onClick={() => {
                                AskReadDirectory()
                            }} size={"xs"}>
                                Select a source folder
                            </Button>
                            <div className="py-3 flex flex-col gap-1.5">

                            {formData.sources.map((handle) => (
                                <div className={"rounded-md text-xs flex justify-between items-center border py-1.5 px-3"}>
                                    {handle.name}
                                    <Button color="light" onClick={() => {
                                        removeSource(handle)
                                    }} size={"xs"}>
                                        Remove source
                                    </Button>
                                </div>
                            ))}
                            </div>
                        </div>
                    </form>
                </Modal.Body>
                <Modal.Footer>
                    <div className="mx-auto">
                        <Button color="blue" onClick={handleSave}>Continue</Button>
                    </div>
                </Modal.Footer>
            </Modal>
        </>
    )
}

export default ProjectModal
