import { Scale } from "./icons"
export default function Select (props){
    return(
        <select className=" w-[10vw] foreforeground border-none active:bg-none select-ghost">
                <option className="foreforeground" disabled={true}>How important is your Task?</option>
                <option className="foreforeground">Important</option>
                <option>Average</option>
                <option>For sometime</option>
</select>
    )
}