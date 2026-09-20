// Explicit one-off read-only adapter smoke test. No database or source-document persistence.
import {discoverDocuments,fetchBounded,assertPdf,MAX_PDF_BYTES} from '../../../backend/supabase/functions/knowledge-source-check/discovery.mjs';
for(const path of ['season-materials','playing-field']){
 const url='https://www.firstinspires.org/resources/library/frc/'+path;
 const response=await fetchBounded(url,2*1024*1024);
 const html=new TextDecoder().decode(response.data),current=discoverDocuments(html,url,2026),future=discoverDocuments(html,url,2027);
 console.log(JSON.stringify({page:path,currentLinks:current.documents.length,pdfs:current.documents.filter(d=>d.supported).length,futureLinks:future.documents.length}));
 if(path==='season-materials'){
  const manual=current.documents.find(d=>/2026GameManual.pdf$/i.test(d.url));if(!manual)throw new Error('Current manual was not discovered');
  const result=await fetchBounded(manual.url,MAX_PDF_BYTES);assertPdf(result.data);console.log(JSON.stringify({manual:manual.title,bytes:result.data.length,pdfHeaderValid:true}));
 }
}
