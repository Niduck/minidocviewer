import {useEffect, useRef} from "react";
export default function ({markdown}: { markdown: string }) {

    const mdeContainer = useRef(null);
    const mdeInstance = useRef(null);

    return (
        <div ref={mdeContainer} className={"markdown-body relative"}>
            <textarea  className={"w-full h-full "} defaultValue={markdown}></textarea>
        </div>
    )
}
