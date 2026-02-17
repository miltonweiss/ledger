export default function Header (props){
    return(
    <h1 className="mb-[1rem]"> <span className="deemphesize">{props.demph} </span> <span className="bold"> {props.emph} </span> </h1>
    )
}