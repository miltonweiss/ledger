import Link from "next/link"
import { Dashboard, Habits, ToDo, Notes, Plus } from "./icons"
export default function DropdownTop() {
    const links = [
        {
            "href": "/todo/new",
            "name": "To Do",
            
        },
        {
            "href": "/habit/new",
            "name": "Habit",
            
        },
        {
          "href": "/notes/new",
          "name": "Note",
          
      },

    ]
    return(
        <div className="dropdown dropdown-top dropdown-end w-full flex justify-center">
        <div tabIndex={0} role="button" className="btn accent-bg border-none mt-3 hover:opacity-85 flex items-center justify-center"><Plus/></div>
        <ul tabIndex={-1} className="dropdown-content foreforeground menu w-48 borderDefault rounded-box z-[100] px-2 py-1 shadow-sm">
  {links.map((link) => (
    <li key={link.href}>
      <Link href={link.href}>{link.name}</Link>
    </li>
  ))}
</ul>

        </div>

    )
}