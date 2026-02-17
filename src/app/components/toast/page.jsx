"use client";
import Header from "@/components/header"
import { normalToast, redToast, greenToast, yellowToast, purpleToast, blueToast, orangeToast } from "@/components/toasts";
export default function Components (){
    return(
        <div>
            <Header
            demph={"Wow, a"}
            emph={"Toast"}
      />
      <div className="foreground h-[85vh] borderDefault flex justify-center items-center gap-4">
      <button
        className="ghost-btn"
        onClick={() =>
            normalToast("Done!", "You did a great Job!")
        }
      >Normal</button>
    <button
        className="ghost-btn"
        onClick={() =>
            redToast("Deleted", "There it goes...")
            }
        
      >Red</button>
    <button
        className="ghost-btn"
        onClick={() =>
            greenToast("Done!", "You did a great Job!")
        }
      >Green</button>
    <button
        className="ghost-btn"
        onClick={() =>
            yellowToast("Done!", "You did a great Job!")
        }
      >Yellow</button>
    <button
        className="ghost-btn"
        onClick={() =>
            purpleToast("Done!", "You did a great Job!")
        }
      >Purple</button>
    <button
        className="ghost-btn"
        onClick={() =>
            blueToast("Done!", "You did a great Job!")
        }
      >Blue</button>
    <button
        className="ghost-btn"
        onClick={() =>
            orangeToast("Done!", "You did a great Job!")
        }
      >Orange</button>

      </div>
        </div>
        
    )
}