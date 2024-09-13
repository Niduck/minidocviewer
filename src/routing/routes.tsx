import IndexView from "../views/IndexView.tsx";
import ProjectView from "../views/ProjectView";

 const routes = [

    {
        path: "/",
        element: <IndexView/>
    },
     {
         path: "/reader",
         element: <ProjectView/>
     }
]
export default routes;
