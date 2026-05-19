import { Scale } from "./icons"
export default function Select ({ value, onChange }){
    return(
        <select 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="w-[10vw] foreforeground border-none active:bg-none select-ghost rounded-md bg-[var(--surface-sunken)] px-2 py-1"
        >
                <option className="foreforeground" disabled={true} value="">How important is your Task?</option>
                <option className="foreforeground" value="Important">Important</option>
                <option value="Average">Average</option>
                <option value="For sometime">For sometime</option>
</select>
    )
}