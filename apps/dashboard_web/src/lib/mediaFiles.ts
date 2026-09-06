import {supabase} from "../supabase";

export const MAX_MEDIA_BYTES=15*1024*1024;
export const MAX_SCREENSHOT_BYTES=10*1024*1024;

export async function prepareImage(file:File,maxEdge=2200,quality=.84):Promise<File>{
  if(!file.type.startsWith("image/")||file.type==="image/gif"||file.size<900_000)return file;
  const bitmap=await createImageBitmap(file),scale=Math.min(1,maxEdge/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  canvas.getContext("2d")?.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/webp",quality));
  return blob?new File([blob],file.name.replace(/\.[^.]+$/,".webp"),{type:"image/webp"}):file;
}

export function safeStorageName(name:string){const extension=name.includes(".")?name.split(".").pop()!.toLowerCase():"bin";return `${crypto.randomUUID()}.${extension.replace(/[^a-z0-9]/g,"")||"bin"}`;}

export async function signedFileUrl(bucket:string,path:string){const{data,error}=await supabase.storage.from(bucket).createSignedUrl(path,60*60);return error?"":data.signedUrl;}
