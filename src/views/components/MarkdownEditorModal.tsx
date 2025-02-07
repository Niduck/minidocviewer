import {Modal, Textarea} from "flowbite-react";
import {useEffect, useRef, useState} from "react";
import {TreeNodeType} from "../../types/TreeNodeType.ts";

function MarkdownEditorModal({
                                 isOpen,
                                 onClose,
                                 defaultValue
                             }: {
    isOpen: boolean,
    onClose: (data?: string) => void,
    defaultValue?: TreeNodeType | null
}) {

    const [formData, setFormData] = useState<string>('')
    const formRef = useRef(null)

    useEffect(() => {
        (async () => {
            if (defaultValue) {
                const _file = await defaultValue.fileHandle?.getFile();
                if (_file) {
                    const contents = await _file.text();
                    setFormData(contents)
                }
            }
        })()
    }, [defaultValue]);


    function _onClose(data?: string) {
        setFormData('')
        onClose?.(data)
    }


    async function handleSave(markdown: string) {
        const writable = await defaultValue?.fileHandle?.createWritable();
        if (writable) {
            await writable.write(markdown);
            await writable.close();
        }
    }


    return (
        <>
            <Modal size={"5xl"} show={isOpen} onClose={_onClose}>
                <Modal.Header>{
                    defaultValue ? "Edit markdown" : "New markdown"
                }</Modal.Header>
                <Modal.Body>
                    <form ref={formRef} autoComplete={"off"} className="flex flex-col w-full items-stretch gap-3">
                        <div>
                            <Textarea className="h-[60vh] min-h-max" autoComplete={"off"} name="name"
                                      defaultValue={formData} onChange={(e) => {
                                handleSave(e.target.value)
                            }} id="markdown"/>
                        </div>

                    </form>
                </Modal.Body>
            </Modal>
        </>
    )
}

export default MarkdownEditorModal
