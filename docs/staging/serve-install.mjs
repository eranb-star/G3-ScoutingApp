// Local UI clipboard bridge for schema-only SQL. Never serves environment files or credentials.
import http from 'node:http';import fs from 'node:fs/promises';
const sql=await fs.readFile(new URL('./schema-install.local.sql',import.meta.url),'utf8');
http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<h1>G3 QA schema installation</h1><p>Target only: cyooubycafubbnkjcqlw</p><button onclick="navigator.clipboard.writeText(document.querySelector(\'textarea\').value).then(()=>this.textContent=\'Copied\')">Copy QA schema SQL</button><textarea style="display:block;width:90%;height:180px">'+sql.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</textarea>');}).listen(4209,'127.0.0.1',()=>console.log('QA schema clipboard http://127.0.0.1:4209'));
