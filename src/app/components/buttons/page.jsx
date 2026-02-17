import Header from "@/components/header"
import Subheader from "@/components/subhead"
export default function Buttons (){
    return(
        <div>
            <Header
            demph={"Wow,"}
            emph={" a Button"}
      />
      <div className="foreground h-[90vh] no-scrollbar  scrollContainer borderDefault">

         
                    
                <div className="flex flex-col foreforeground h-[90vh] gap-5 items-center justify-center p-6">
                    <div className="flex  items-center justify-center">
                        <Subheader
                        text="Clean"
                        />
                    </div>
                    <div className=" flex gap-5 items-center justify-center">
                        <button className="bg-orange-400 borderDefault px-3 py-1 ">Click Me!</button>
                        <button className="bg-zinc-300 text-black borderDefault px-3 py-1  ">Click Me!</button>
                        <button className="bg-zinc-400 text-black  px-3 py-1 !border-none shadow-lg shadow-zinc-400 ">Click Me!</button>
                    </div>
                </div>

                
      </div>
        </div>
        
    )
}