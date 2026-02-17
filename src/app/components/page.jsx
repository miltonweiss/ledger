"use client"

import Header from "@/components/header"
import { useRouter } from "next/navigation"

export default function Components (){
    const router = useRouter()
    const componentsArr = [
        {
            "name" : "Buttons",
            "function": "Interaction with elements"
        },
        {
            "name" : "Toast",
            "function": "Display Notifications"
        },
        {
            "name" : "Textsplit",
            "function": "Split Texts via document id into chunks"
        },
        {
            "name" : "Documentadmin",
            "function": "Add and see documents"
        },
        {
            "name" : "admin-chunk",
            "function": "Add and see documents"
        },
        
       
       
    ]
    return(
        <div>
            <Header
            demph={"Take a look at the different"}
            emph={"Components"}
      />
      <div className="foreground h-[85vh] borderDefault">
      <div className="overflow-x-auto">
  <table className="table">
    {/* head */}
    <thead>
      <tr>
        
        <th>Name</th>
        <th>Functionality</th>
        
      </tr>
    </thead>
    <tbody>
        {componentsArr.map( (component, index) => {
            return(
                <tr 
                    key={component.name + index} 
                    className="hover:opacity-50 hover:cursor-pointer foreforeground"
                    onClick={() => router.push(`/components/${component.name.toLowerCase()}`)}
                >
                    <td> {component.name} </td>
                    <td> {component.function} </td>
                </tr>
            )
        } )}
      
    </tbody>
  </table>
</div>
      </div>
        </div>
        
    )
}