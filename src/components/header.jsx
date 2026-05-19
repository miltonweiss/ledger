export default function Header (props){
    return(
        <div className="page-header">
            {props.demph && <span className="page-header-eyebrow">{props.demph}</span>}
            <h1 className="page-header-title">{props.emph}</h1>
            {props.actions && <div className="page-header-actions">{props.actions}</div>}
        </div>
    )
}