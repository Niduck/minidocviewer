import {useEffect} from "react";
import {marked} from "marked";
import admonition from "marked-admonition-extension";
import mermaid from "mermaid";

marked.use(admonition);
mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral'
});

const renderer = new marked.Renderer();
renderer.heading = (data) => {
    const id = data.text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return `<h${data.depth} id="${id}">${data.text}</h${data.depth}>`;
};
renderer.code = (code) => {
    if (code.lang === 'mermaid') {
        // Générer un ID unique pour le diagramme
        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

        // Retourner un div avec un ID unique et le code Mermaid comme contenu
        return `<div class="mermaid" id="${uniqueId}">${code.text}</div>`;
    } else {
        const uniqueId = `code-${Math.random().toString(36).substring(2, 9)}`;
        return `
            <div class="relative group">
                <button type="button" class="copy-btn absolute top-2 right-2 bg-black  bg-opacity-75 text-white text-xs px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                    data-code-id="${uniqueId}">
                    <div class="icon icon-copy"></div>Copy
                </button>
                <pre id="${uniqueId}"><code class="language-${code.lang}">${code.text}</code></pre>
            </div>
    `;
    }
};
marked.setOptions({
    renderer: renderer,
    gfm: true,
    breaks: true
});

export function MarkedViewer({markdown}: { markdown: string }) {
    const onCopyButtonClick = (event: MouseEvent) => {
        const button = event.currentTarget as HTMLButtonElement;
        const codeId = button.getAttribute("data-code-id");
        if (codeId) {
            const codeBlock = document.getElementById(codeId) as HTMLPreElement;
            if (!codeBlock) return;

            navigator.clipboard.writeText(codeBlock.innerText).then(() => {
                button.innerHTML = `<div class="icon icon-check"></div> Copied !`;
                setTimeout(() => {
                    button.innerHTML = `<div class="icon icon-copy"></div> Copier`;
                }, 2000);
            });
        }
    };


    useEffect(() => {
        const observer = new MutationObserver(() => {
            const buttons = document.querySelectorAll<HTMLButtonElement>(".copy-btn");

            buttons.forEach((button) => {
                button.removeEventListener("click", onCopyButtonClick);
                button.addEventListener("click", onCopyButtonClick);
            });

            //activate mermaid
            setTimeout(function () {
                mermaid.init(undefined, document.querySelectorAll('.mermaid'));
            }, 300)

        });

        const markdownContainer = document.getElementById("markdown-container");
        if (markdownContainer) {
            observer.observe(markdownContainer, {childList: true, subtree: true});
        }


        return () => observer.disconnect();
    }, [markdown]);

    return <div id={"markdown-container"} dangerouslySetInnerHTML={{__html: marked(markdown)}}/>;
}