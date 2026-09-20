import {ReactNode,useEffect,useRef} from "react";
import "../styles/dialog.css";
export default function AccessibleDialog({title,onClose,children,className=""}:{title:string;onClose:()=>void;children:ReactNode;className?:string}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
 return <dialog ref={ref} className={`g3-accessible-dialog ${className}`} aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><div>{children}</div></dialog>;
}
