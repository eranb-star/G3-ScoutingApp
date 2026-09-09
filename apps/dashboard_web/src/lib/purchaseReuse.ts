export type ReusablePurchase = {id:string;part_id:string|null;item_name:string;supplier:string|null;product_url:string|null;status:string;created_at:string;category?:string|null;part_number?:string|null};
export type ReusablePart = {id:string;name:string;category:string;part_number:string|null;supplier:string|null};

export function purchaseDraft(source?:ReusablePurchase, part?:ReusablePart){
  return {part_id:part?.id??"",item_name:part?.name??source?.item_name??"",quantity:"1",estimated_cost:"",supplier:source?.supplier??part?.supplier??"",product_url:source?.product_url??"",urgency:"normal",reason:""};
}

export function filterPurchaseHistory<T extends ReusablePurchase>(purchases:T[],parts:ReusablePart[],query:string,category:string){
  const byId=new Map(parts.map(part=>[part.id,part]));
  const term=query.trim().toLocaleLowerCase();
  return purchases.filter(item=>{
    const part=item.part_id?byId.get(item.part_id):undefined;
    return (!category||(item.category??part?.category??"uncategorized")===category)&&(!term||[item.item_name,item.supplier,item.product_url,item.part_number??part?.part_number,item.category??part?.category].filter(Boolean).join(" ").toLocaleLowerCase().includes(term));
  });
}

export function latestReceivedPurchase<T extends ReusablePurchase>(purchases:T[],partId:string){
  return purchases.filter(item=>item.part_id===partId&&item.status==="received").sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];
}
