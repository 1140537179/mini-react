import React  from "./React.js";
const ReactDoM = {
    createRoot(container){
        return {
            render(el){
                React.render(el, container);
            }
        }
    }
}

export default ReactDoM;