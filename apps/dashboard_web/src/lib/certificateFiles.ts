/** Render documents into pixels; the upload service validates and re-encodes every page. */
export async function certificatePages(file:File):Promise<Blob[]>{
 if(file.size>10*1024*1024)throw new Error('Choose a certificate smaller than 10 MB.');
 if(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf')){
  const {getDocumentProxy}=await import('unpdf');
  const pdf=await getDocumentProxy(new Uint8Array(await file.arrayBuffer()),{isEvalSupported:false});
  try{
   if(pdf.numPages>3)throw new Error('Choose the certificate only (up to three pages), not the complete course document.');
   const pages:Blob[]=[];
   for(let n=1;n<=pdf.numPages;n++){
    const page=await pdf.getPage(n),base=page.getViewport({scale:1}),scale=Math.min(2,2200/Math.max(base.width,base.height));
    const viewport=page.getViewport({scale}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    await page.render({canvas,canvasContext:canvas.getContext('2d')!,viewport}).promise;
    pages.push(await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not read this page.')),'image/png')));canvas.width=canvas.height=0;
   }return pages;
  }finally{await pdf.destroy();}
 }
 if(!['image/png','image/jpeg'].includes(file.type))throw new Error('Choose a PDF, JPEG or PNG certificate.');
 const bitmap=await createImageBitmap(file);
 try{const scale=Math.min(1,2200/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);return [await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not read this image.')),'image/png'))];}finally{bitmap.close();}
}
