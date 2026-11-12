// Cloudflare Email Worker v15 tyrestires.ca
const WAVE_TOKEN='jcj3082D57A6qIc8qJSy856FoZOHV7';
const WAVE_BIZ_ID='QnVzaW5lc3M6YjM5MGQ0ZWEtYjlmYi00NDkzLWI2MDEtNGIyMGY5MmRkYzZi';
const WAVE_URL='https://gql.waveapps.com/graphql/public';
const PRODUCT_TIRE='QnVzaW5lc3M6YjM5MGQ0ZWEtYjlmYi00NDkzLWI2MDEtNGIyMGY5MmRkYzZiO1Byb2R1Y3Q6MTQwNTYwODA4';
const PRODUCT_WHEEL='QnVzaW5lc3M6YjM5MGQ0ZWEtYjlmYi00NDkzLWI2MDEtNGIyMGY5MmRkYzZiO1Byb2R1Y3Q6MTQwNTYwODA5';
const PRODUCT_LEVY='QnVzaW5lc3M6YjM5MGQ0ZWEtYjlmYi00NDkzLWI2MDEtNGIyMGY5MmRkYzZiO1Byb2R1Y3Q6MTQwNTYwODEw';
const TAX_GST='QnVzaW5lc3M6YjM5MGQ0ZWEtYjlmYi00NDkzLWI2MDEtNGIyMGY5MmRkYzZiO1NhbGVzVGF4OjE5NDU2MzcxMTU=';
const SUPPLIER_EMAIL='paul@pauljanzendesign.com';
async function wave(query,variables){
  const res=await fetch(WAVE_URL,{method:'POST',headers:{'Authorization':'Bearer '+WAVE_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({query,variables})});
  const data=await res.json();
  if(data.errors){throw new Error('Wave error: '+JSON.stringify(data.errors));}
  return data.data;
}
function parseQuoteReply(subject,body){
  const text=subject+'\n'+body;
  const refMatch=text.match(/TT-([A-Z0-9]{6})/i);
  let ref=null;
  if(refMatch){ref='TT-'+refMatch[1].toUpperCase();}
  const shipRe=/shipping[:\s]+\$(\d+(\.\d{1,2})?)/i;
  const labelledMatch=text.match(shipRe);
  let shippingTotal=null;
  if(labelledMatch){shippingTotal=parseFloat(labelledMatch[1]);}
  let lbl='NONE';
  if(labelledMatch){lbl=labelledMatch[0];}
  console.log('PARSE labelled:',lbl,'result:',shippingTotal);
  return {ref,shippingTotal};
}
function buildQuoteHtml(order){
  const ref=order.ref;
  const cart=order.cart||[];
  const c=order.customer||{};
  const supplierName=order.supplierName||'Supplier';
  const supplierCode=order.supplierCode||'';
  const itemRows=cart.map(function(i){
    const sku=i.sku||i.partNumber||'';
    const label=((i.brand||'')+' '+(i.name||'')+' '+(i.size||'')).trim();
    return '<tr><td style="padding:12px 16px;border-bottom:1px solid #2a2a2a;font-size:14px;color:#e0e0e0;">'+label+(sku?'<br><span style="font-size:11px;color:#888;">SKU: '+sku+'</span>':'')+'</td><td style="padding:12px 16px;border-bottom:1px solid #2a2a2a;font-size:16px;font-weight:700;color:#ffffff;text-align:right;vertical-align:middle;">'+i.qty+'</td></tr>';
  }).join('');
  const itemsHeader=supplierCode?'ITEMS — '+supplierCode:'ITEMS';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shipping Quote Request</title></head><body style="margin:0;padding:0;background:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;"><div style="max-width:600px;margin:0 auto;background:#1a1a1a;"><div style="background:#c0392b;padding:12px 24px;text-align:center;"><p style="margin:0;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Shipping Quote Request — Please Reply With Your Rate</p></div><div style="padding:32px 40px 16px;border-bottom:2px solid #c0392b;"><h1 style="margin:0 0 4px;color:#ffffff;font-size:22px;font-weight:700;">Tyres Tires</h1><p style="margin:0;color:#999;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Shipping Quote Request</p></div><div style="padding:32px 40px;"><p style="margin:0 0 8px;color:#e0e0e0;font-size:15px;">Hi <strong style="color:#ffffff;">'+supplierName+'</strong> team,</p><p style="margin:0 0 32px;color:#b0b0b0;font-size:15px;line-height:1.6;">We have a customer order that requires a <strong style="color:#ffffff;">direct drop-ship</strong> to the customer\'s address below. Please provide a shipping quote at your earliest convenience and reply to this email.</p><p style="margin:0 0 8px;color:#888;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Order Reference</p><div style="border-left:4px solid #c0392b;background:#222;padding:16px 20px;margin:0 0 32px;border-radius:0 4px 4px 0;"><p style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:1px;font-family:monospace;">'+ref+'</p></div><p style="margin:0 0 8px;color:#888;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Ship-To Address</p><div style="background:#222;border:1px solid #333;padding:16px 20px;margin:0 0 32px;border-radius:4px;"><p style="margin:0;color:#ffffff;font-size:14px;font-weight:700;">'+c.firstName+' '+c.lastName+'</p><p style="margin:4px 0 0;color:#b0b0b0;font-size:14px;">'+c.address+'</p><p style="margin:2px 0 0;color:#b0b0b0;font-size:14px;">'+c.city+', '+c.province+' '+c.postal+'</p>'+(c.phone?'<p style="margin:2px 0 0;color:#b0b0b0;font-size:14px;">'+c.phone+'</p>':'')+'<p style="margin:2px 0 0;color:#888;font-size:13px;">'+c.email+'</p></div><p style="margin:0 0 8px;color:#888;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">'+itemsHeader+'</p><table style="width:100%;border-collapse:collapse;background:#222;border:1px solid #333;border-radius:4px;margin:0 0 32px;overflow:hidden;"><thead><tr><th style="padding:10px 16px;background:#2a2a2a;text-align:left;font-size:11px;font-weight:700;letter-spacing:1px;color:#888;text-transform:uppercase;">Product</th><th style="padding:10px 16px;background:#2a2a2a;text-align:right;font-size:11px;font-weight:700;letter-spacing:1px;color:#888;text-transform:uppercase;">QTY</th></tr></thead><tbody>'+itemRows+'</tbody></table><div style="background:#1e2a1e;border:1px solid #2d4a2d;padding:20px 24px;border-radius:4px;"><p style="margin:0;color:#c8e6c9;font-size:14px;line-height:1.6;">Please reply with your best freight rate to ship these items directly to the customer. Once we receive your quote we will confirm the order.</p></div></div><div style="padding:16px 40px 32px;border-top:1px solid #2a2a2a;text-align:center;"><p style="margin:0;color:#555;font-size:12px;">Reply with: <strong style="color:#888;">Shipping $NNN</strong> and reference <strong style="color:#888;">'+ref+'</strong></p><p style="margin:8px 0 0;color:#444;font-size:11px;">Tyres Tires — orders@tyrestires.ca</p></div></div></body></html>';
}
async function sendQuoteRequest(order,resendKey){
  const html=await buildQuoteHtml(order);
  const resp=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':'Bearer '+resendKey,'Content-Type':'application/json'},body:JSON.stringify({from:'Tyres Tires Orders <orders@tyrestires.ca>',to:SUPPLIER_EMAIL,reply_to:'paul@tyrestires.ca',subject:'Shipping Quote Request Order '+order.ref,html})});
  const result=await resp.json();
  if(!resp.ok){throw new Error('Resend error: '+JSON.stringify(result));}
  return result;
}
async function processQuote(ref,order,shippingTotal,kv,resendKey){
  const {cart,customer:c}=order;
  const totalQty=cart.reduce(function(s,i){return s+i.qty;},0);
  const searchData=await wave('query($businessId:ID!){business(id:$businessId){customers(page:1,pageSize:50){edges{node{id name email}}}}}',{businessId:WAVE_BIZ_ID});
  const existing=searchData.business.customers.edges.filter(function(e){return e.node.email===c.email;});
  let customerId;
  if(existing.length>0){
    customerId=existing[0].node.id;
  } else {
    const cd=await wave('mutation($businessId:ID!,$input:CustomerCreateInput!){customerCreate(businessId:$businessId,input:$input){customer{id}didSucceed inputErrors{code message path}}}',{businessId:WAVE_BIZ_ID,input:{name:c.firstName+' '+c.lastName,email:c.email,address:{addressLine1:c.address,city:c.city,provinceCode:c.province,countryCode:'CA',postalCode:c.postal}}});
    if(!cd.customerCreate.didSucceed){throw new Error('Customer create failed: '+JSON.stringify(cd.customerCreate.inputErrors));}
    customerId=cd.customerCreate.customer.id;
  }
  const items=[];
  for(const item of cart){
    const unitPrice=Math.round((item.supplierPrice||0)*1.18*100)/100;
    let productId=PRODUCT_TIRE;
    if(item.type==='wheel'){productId=PRODUCT_WHEEL;}
    items.push({productId,description:((item.brand||'')+' '+(item.name||'')+' '+(item.size||'')).trim(),quantity:item.qty,unitPrice,taxes:[{salesTaxId:TAX_GST}]});
  }
  let shipAmt=shippingTotal;
  if(!shipAmt){shipAmt=25;}
  items.push({productId:PRODUCT_TIRE,description:'Shipping and Handling',quantity:1,unitPrice:shipAmt,taxes:[{salesTaxId:TAX_GST}]});
  items.push({productId:PRODUCT_LEVY,description:'Tire Wheel Environmental Levy',quantity:totalQty,unitPrice:4});
  const today=new Date().toISOString().split('T')[0];
  const dueDate=new Date(Date.now()+7*86400000).toISOString().split('T')[0];
  const inv=await wave('mutation($input:InvoiceCreateInput!){invoiceCreate(input:$input){invoice{id invoiceNumber pdfUrl}didSucceed inputErrors{code message path}}}',{input:{businessId:WAVE_BIZ_ID,customerId,invoiceDate:today,dueDate,memo:'Order '+ref+' Thank you!',items}});
  if(!inv.invoiceCreate.didSucceed){throw new Error('Invoice create failed: '+JSON.stringify(inv.invoiceCreate.inputErrors));}
  const invoiceId=inv.invoiceCreate.invoice.id;
  const invoiceNum=inv.invoiceCreate.invoice.invoiceNumber;
  const apr=await wave('mutation($input:InvoiceApproveInput!){invoiceApprove(input:$input){invoice{id status}didSucceed inputErrors{code message path}}}',{input:{invoiceId}});
  if(!apr.invoiceApprove.didSucceed){throw new Error('Approve failed: '+JSON.stringify(apr.invoiceApprove.inputErrors));}
  const snd=await wave('mutation($input:InvoiceSendInput!){invoiceSend(input:$input){didSucceed inputErrors{code message path}}}',{input:{invoiceId,to:[c.email],subject:'Your Tyres Tires Invoice '+invoiceNum+' Order '+ref,message:'Hi '+c.firstName+', Thank you for your order! Tyres Tires',attachPDF:true}});
  if(!snd.invoiceSend.didSucceed){throw new Error('Invoice send failed: '+JSON.stringify(snd.invoiceSend.inputErrors));}
  const updated={...order,status:'invoiced',invoiceId,invoiceNum,invoicedAt:new Date().toISOString()};
  await kv.put('pending:'+ref,JSON.stringify(updated));
  console.log('SUCCESS invoice',invoiceNum,'sent to',c.email,'for order',ref);
  return {invoiceId,invoiceNum};
}
function decodeQP(s){
  return s.replace(/=\r?\n/g,'').replace(/=([0-9A-Fa-f]{2})/g,function(_,h){return String.fromCharCode(parseInt(h,16));});
}
function extractPlainText(rawMime){
  // Split headers from body at first blank line
  const sep=rawMime.indexOf('\r\n\r\n');
  const headerBlock=sep>=0?rawMime.slice(0,sep):'';
  const bodyBlock=sep>=0?rawMime.slice(sep+4):rawMime;
  // Check content-type for multipart boundary
  const ctMatch=headerBlock.match(/Content-Type:\s*multipart\/[^;]+;\s*boundary="?([^"\r\n]+)"?/i);
  if(ctMatch){
    const boundary='--'+ctMatch[1].trim();
    const parts=bodyBlock.split(new RegExp(boundary+'(?:--)?\\r?\\n?'));
    let plainPart='';
    for(const part of parts){
      if(!part||part.trim()===''||part.trim()==='-')continue;
      const pSep=part.indexOf('\r\n\r\n');
      if(pSep<0)continue;
      const pHeader=part.slice(0,pSep);
      const pBody=part.slice(pSep+4);
      if(/Content-Type:\s*text\/plain/i.test(pHeader)){
        if(/Content-Transfer-Encoding:\s*quoted-printable/i.test(pHeader)){
          plainPart=decodeQP(pBody);
        } else if(/Content-Transfer-Encoding:\s*base64/i.test(pHeader)){
          try{plainPart=atob(pBody.replace(/\s/g,''));}catch(e){plainPart=pBody;}
        } else {
          plainPart=pBody;
        }
        break;
      }
    }
    return plainPart||bodyBlock;
  }
  // Single-part: check top-level encoding
  const encMatch=headerBlock.match(/Content-Transfer-Encoding:\s*(\S+)/i);
  if(encMatch){
    const enc=encMatch[1].toLowerCase();
    if(enc==='quoted-printable'){return decodeQP(bodyBlock);}
    if(enc==='base64'){try{return atob(bodyBlock.replace(/\s/g,''));}catch(e){}}
  }
  return bodyBlock;
}
export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==='POST'&&url.pathname==='/quote-request'){
      const ref=url.searchParams.get('ref');
      if(!ref){return new Response('Missing ref',{status:400});}
      const raw=await env.PO_SENT.get('pending:'+ref);
      if(!raw){return new Response('Order not found: '+ref,{status:404});}
      const order=JSON.parse(raw);
      if(order.status==='invoiced'){return new Response('Already invoiced',{status:200});}
      await sendQuoteRequest(order,env.RESEND_API_KEY);
      const updated={...order,status:'quote_requested',quoteSentAt:new Date().toISOString()};
      await env.PO_SENT.put('pending:'+ref,JSON.stringify(updated));
      return new Response(JSON.stringify({ok:true,ref,status:'quote_requested'}),{headers:{'Content-Type':'application/json'}});
    }
    if(url.pathname==='/debug-read'){
      const val=await env.PO_SENT.get('debug:last-email');
      let dbg='{"error":"no debug data"}';
      if(val){dbg=val;}
      return new Response(dbg,{headers:{'Content-Type':'application/json'}});
    }
    if(request.method==='POST'&&url.pathname==='/debug-parse'){
      const {subject,body}=await request.json();
      const result=parseQuoteReply(subject||'',body||'');
      return new Response(JSON.stringify(result),{headers:{'Content-Type':'application/json'}});
    }
    if(url.pathname==='/ping'){return new Response('pong v15',{status:200});}
    return new Response('Not found',{status:404});
  },
  async email(message,env,ctx){
    const subject=message.headers.get('subject')||'';
    const from=message.from||'';
    try{await message.forward(env.FORWARD_TO);}catch(e){console.error('Forward error:',e.message);}
    let body='';
    try{
      const reader=message.raw.getReader();
      const chunks=[];
      while(true){
        const rd=await reader.read();
        if(rd.done){break;}
        chunks.push(rd.value);
      }
      const all=new Uint8Array(chunks.reduce(function(a,b){return a+b.length;},0));
      let off=0;
      for(const c of chunks){all.set(c,off);off+=c.length;}
      const rawMime=new TextDecoder().decode(all);
      body=extractPlainText(rawMime);
    }catch(e){console.error('Body read error:',e.message);}
    console.log('INBOUND EMAIL from:',from,'subject:',subject);
    try{
      await env.PO_SENT.put('debug:last-email',JSON.stringify({subject,from,bodyFirst2000:body.slice(0,2000),ts:new Date().toISOString()}));
    }catch(e){console.error('Debug KV save error:',e.message);}
    const parsed=parseQuoteReply(subject,body);
    const ref=parsed.ref;
    const shippingTotal=parsed.shippingTotal;
    console.log('PARSED ref:',ref,'shippingTotal:',shippingTotal);
    if(!ref){console.log('No order ref found skipping');return;}
    if(!shippingTotal){console.log('No shipping amount found skipping');return;}
    const raw=await env.PO_SENT.get('pending:'+ref);
    if(!raw){console.log('No KV entry for',ref);return;}
    const order=JSON.parse(raw);
    if(order.status==='invoiced'){console.log('Already invoiced:',ref);return;}
    console.log('Creating invoice for',ref,'shipping:',shippingTotal);
    try{
      const result=await processQuote(ref,order,shippingTotal,env.PO_SENT,env.RESEND_API_KEY);
      console.log('Invoice',result.invoiceNum,'created and sent id:',result.invoiceId);
    }catch(err){console.error('processQuote FAILED:',err.message);}
  }
};
