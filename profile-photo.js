export const MAX_PHOTO_BYTES=10*1024*1024,MAX_PHOTO_PIXELS=24000000,MAX_SAVED_PHOTO=150000;
export function photoDimensions(bytes){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),v=new DataView(b.buffer,b.byteOffset,b.byteLength);
 if(b.length>=24&&[137,80,78,71,13,10,26,10].every((n,i)=>b[i]===n)&&String.fromCharCode(...b.slice(12,16))==='IHDR')return {width:v.getUint32(16),height:v.getUint32(20),type:'image/png'};
 if(b.length<4||b[0]!==255||b[1]!==216)throw Error('Choose a JPEG or PNG photo.');
 let i=2;while(i+3<b.length){if(b[i++]!==255)throw Error('Could not read that photo.');while(b[i]===255)i++;const marker=b[i++];if(marker===0xda||marker===0xd9)break;if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;const len=v.getUint16(i);if(len<2||i+len>b.length)break;if([0xc0,0xc1,0xc2].includes(marker)){if(len<8)break;return {width:v.getUint16(i+5),height:v.getUint16(i+3),type:'image/jpeg'};}i+=len;}
 throw Error('Could not read that photo. Choose a standard JPEG or PNG.');
}
export function validatePhoto(photo){if(photo==null)return;if(typeof photo!=='string'||photo.length>MAX_SAVED_PHOTO||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo))throw Error('Invalid profile photo.');try{const b=Uint8Array.from(atob(photo.split(',')[1]),c=>c.charCodeAt(0)),d=photoDimensions(b);if(d.type!=='image/jpeg'||d.width!==256||d.height!==256||b.at(-2)!==255||b.at(-1)!==217)throw Error();}catch{throw Error('Invalid profile photo.');}}
export async function prepareProfilePhoto(file){
 if(!file||file.size<1||file.size>MAX_PHOTO_BYTES)throw Error('Choose a JPEG or PNG under 10 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length>MAX_PHOTO_BYTES)throw Error('Choose a photo under 10 MB.');const d=photoDimensions(bytes);
 if(d.width<1||d.height<1||d.width>12000||d.height>12000||d.width*d.height>MAX_PHOTO_PIXELS)throw Error('Choose a photo with 24 megapixels or less.');
 let bitmap;try{bitmap=await createImageBitmap(new Blob([bytes],{type:d.type}));if(bitmap.width*bitmap.height>MAX_PHOTO_PIXELS)throw Error();const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');if(!ctx)throw Error();ctx.fillStyle='#ffffff';ctx.fillRect(0,0,256,256);const size=Math.min(bitmap.width,bitmap.height);ctx.drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,256,256);const photo=canvas.toDataURL('image/jpeg',.85);validatePhoto(photo);return photo;}catch{throw Error('Could not process that photo. Try a different JPEG or PNG.');}finally{bitmap?.close();}
}
