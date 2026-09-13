import {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {useAccessControl,PermissionKey} from '../lib/accessControl';
export default function LabScreenGate({permission,children}:{permission:PermissionKey;children:ReactNode}){const {can}=useAccessControl();return can(permission)?<>{children}</>:<main className="hub-page"><h1>Screen unavailable</h1><p>Your role does not have access to this screen. An administrator can enable it in Roles & permissions.</p><Link to="/home">Back to Home</Link></main>;}
