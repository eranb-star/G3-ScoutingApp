import {build} from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('../..'),out=path.join(root,'docs/staging/workflow-release.local');
await fs.mkdir(out,{recursive:true});
for(const [name,entry] of Object.entries({
 'frc-assistant':'backend/supabase/functions/frc-assistant/index.ts',
 'onshape-connector':'backend/supabase/functions/onshape-connector/index.ts',
 'manage-member':'supabase/functions/manage-member/index.ts',
 'send-action-push':'supabase/functions/send-action-push/index.ts',
})){
 await build({configFile:false,logLevel:'warn',build:{target:'es2022',minify:false,outDir:out,emptyOutDir:false,lib:{entry:path.join(root,entry),formats:['es'],fileName:()=>name+'.ts'},rollupOptions:{external:id=>id.startsWith('https://'),output:{inlineDynamicImports:true}}}});
 console.log('Bundled '+name);
}
