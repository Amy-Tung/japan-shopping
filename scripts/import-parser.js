/* Local, best-effort parsing of shopping notes. All detected prices are JPY. */
'use strict';
(function(root){
 const CN='零〇一二兩三四五六七八九十百千';const Q='[0-9'+CN+']+';const U='(?:件|盒|包|個|本|瓶|袋|組|罐|雙|套|枚|支|條|顆|台|臺)';
 const unknown=/^(?:(?:單價|價格|價錢|金額|price)\s*[：:=]?\s*)?(?:未知|未填|未填寫|不明|待補|待確認|不知道|不清楚|未定|unknown|tbd|n\/?a|[-—?？])$/i;
 function number(raw){raw=String(raw||'').trim();if(/^\d+$/.test(raw))return String(BigInt(raw));const digits={'零':0,'〇':0,'一':1,'二':2,'兩':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};if(!raw||!new RegExp('^['+CN+']+$').test(raw))return null;if(!/[十百千]/.test(raw))return raw.split('').map(c=>digits[c]).join('');let total=0,n=0;for(const c of raw){if(c in digits)n=digits[c];else{total+=(n||1)*({'十':10,'百':100,'千':1000}[c]);n=0}}return String(total+n)}
 function price(raw){raw=String(raw||'').trim();if(!raw||unknown.test(raw))return '';raw=raw.replace(/^(?:單價|價格|價錢|金額|price)\s*[：:=]?\s*/i,'').replace(/(?:NTD|USD|HKD|NT|US|HK|JPY|日圓|日元|円|元|[$¥￥])/gi,'').replace(/[\s,]/g,'');if(!/^-?\d+(?:\.\d+)?$/.test(raw))return '';if(/^\d+\.0+$/.test(raw))raw=raw.split('.')[0];return raw}
 function clean(raw){return raw.replace(/^[\s,，:：;；|｜、()（）]+|[\s,，:：;；|｜、()（）]+$/g,'').replace(/^商品(?:名稱|名)?\s*[：:]/,'').trim()}
 function csv(raw){let cells=[],s='',quoted=false;for(let i=0;i<raw.length;i++){const c=raw[i];if(c==='"'){if(quoted&&raw[i+1]==='"'){s+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){cells.push(s.trim());s=''}else s+=c}cells.push(s.trim());return cells}
 function fields(line){if(line.includes('\t'))return line.split('\t').map(s=>s.trim());const safe=line.replace(/(?:NT|US|HK)?[$¥￥]\s*-?\d{1,3}(?:,\d{3})+(?:\.\d+)?/g,s=>s.replace(/,/g,''));return csv(safe)}
 function quantityFromCell(cell){if(!String(cell||'').trim())return '1';const m=String(cell).trim().match(new RegExp('^('+Q+')\\s*'+U+'?$'));return m?number(m[1]):number(cell)}
 function parseLine(line,index,header){let work=line,qty='1',qtyFound=false;const cells=fields(work);
  if(header&&cells.length>1){const name=clean(cells[header.name]||'')||'商品 '+(index+1);const p=price(cells[header.price]||'');const q=header.qty===null?'1':quantityFromCell(cells[header.qty]);return{name,price:p,qty:q||'1'}}
  function removeQty(regex,group){const m=work.match(regex);if(!m)return false;const n=number(m[group]);if(n===null)return false;qty=n;qtyFound=true;work=work.slice(0,m.index)+' '+work.slice(m.index+m[0].length);return true}
  // Explicit quantity wins. A leading quantity is stripped only for unpacked units.
  removeQty(new RegExp('(?:數量|qty|quantity)\\s*[：:=]?\\s*('+Q+')\\s*(?:'+U+')?','i'),1)||removeQty(new RegExp('(?:×|[xX*])\\s*('+Q+')\\s*(?:'+U+')?(?=[\\s,，]|$)'),1);
  if(!qtyFound)removeQty(new RegExp('^('+Q+')\\s*(?:×|[xX*])\\s*'),1);
  if(!qtyFound)removeQty(new RegExp('^('+Q+')\\s*'+U+'(?!裝|入)'),1);
  if(!qtyFound)removeQty(new RegExp('('+Q+')\\s*'+U+'(?!裝|入)(?=[\\s,，:：()（）]|$)'),1);
  work=clean(work);const parts=fields(work);if(parts.length>=2&&parts.length<=3&&!/\s\d+$/.test(parts[0])){const candidate=parts[1],q=parts.length===3?quantityFromCell(parts[2]):null;if((price(candidate)!==''||unknown.test(candidate))&&(parts.length===2||q!==null)){return{name:clean(parts[0])||'商品 '+(index+1),price:price(candidate),qty:parts.length===3?q:qty}}}
  // Plain space-separated name, price, quantity, while preserving names with spaces.
  if(!qtyFound){const m=work.match(/^(.+?)\s+([$¥￥]?\s*-?\d+(?:,\d{3})*(?:\.\d+)?)\s+([0-9]+)$/);if(m)return{name:clean(m[1])||'商品 '+(index+1),price:price(m[2]),qty:number(m[3])}}
  const amount='(-?\\d[\\d,]*(?:\\.\\d+)?)';const unitPattern=new RegExp('(?:單價|unit\\s*price)\\s*[：:=]?\\s*[$¥￥]?\\s*'+amount,'i');const totalPattern=new RegExp('(?:總價|總金額|合計|總共|total)\\s*[：:=]?\\s*[$¥￥]?\\s*'+amount,'i');const explicitUnit=work.match(unitPattern),explicitTotal=work.match(totalPattern);const moneyPatterns=[unitPattern,...(!explicitUnit&&explicitTotal?[totalPattern]:[]),new RegExp('(?:NTD|USD|HKD|NT|US|HK)?\\s*[$¥￥]\\s*'+amount,'i'),new RegExp('(?:JPY|日圓|日元)\\s*'+amount,'i'),new RegExp('(?:單價|價格|價錢|金額|price)\\s*[：:=]?\\s*[$¥￥]?\\s*'+amount,'i'),new RegExp(amount+'\\s*(?:日圓|日元|JPY|円|元)','i')];let found=null;for(const re of moneyPatterns){const m=work.match(re);if(m){found=m;break}}
  const unknownPattern=/(?:單價|價格|價錢|金額|price)?\s*[：:=]?\s*(?:未知|未填寫|未填|不明|待補|待確認|不知道(?:價格)?|不清楚|未定|unknown|tbd|n\/?a)(?:價格)?/ig;
  const hasUnknown=unknownPattern.test(work);unknownPattern.lastIndex=0;
  if(!found&&!hasUnknown&&!/(?:iPhone|iPad|Pixel|Galaxy|PlayStation|型號|model)\s*\d+$/i.test(work)){found=work.match(new RegExp('(?:^|[\\s,，:：])'+amount+'\\s*$'))}
  let p='';if(found){p=price(found[1]);if(explicitTotal&&!explicitUnit&&/^\d+$/.test(p)){const q=BigInt(qty);p=q>0n&&BigInt(p)%q===0n?(BigInt(p)/q).toString():''}work=work.slice(0,found.index)+' '+work.slice(found.index+found[0].length)}
  if(!found)work=work.replace(unknownPattern,'');work=work.replace(/(?:單價|價格|價錢|金額|price)\s*[：:=]?\s*[-—?？]\s*$/i,'');const name=clean(work)||'商品 '+(index+1);return{name,price:p,qty}
 }
 function parse(raw){if(typeof raw!=='string'||raw.length>200000)throw Error('內容太長，請分成較小的清單。');raw=raw.replace(/\r\n?/g,'\n').normalize('NFKC').replace(/，/g,',');if(!raw.trim())throw Error('先貼上商品內容。');const lines=raw.split(/[\n;；]+/).map(s=>s.trim()).filter(Boolean);let buyer='',items=[],header=null;
  for(let line of lines){line=line.replace(/^(?:[-*•·]\s+|\d+[.)、]\s+)/,'').trim();let m=line.match(/^(?:訂購人(?:姓名)?|購買人|姓名|buyer)\s*[：:=]\s*(.*)$/i);if(m){buyer=m[1].trim();if(['尚未填寫','未填姓名'].includes(buyer))buyer='';continue}
   if(/^(?:炭寶代購團\s*[|｜]\s*(?:日本購物清單|訂購單)|日本代購小清單|日本代購付款明細|商品明細|商品清單|訂購單|訂購清單|訂購單预览|訂購單預覽)$/.test(line))continue;
   if(/^(?:日幣加總|日幣總計|日幣合計|日幣含稅總額|換算台幣|要給\s*Amy\s*的錢|清單金額|最後需支付|採用匯率)\s*[：:]/i.test(line))continue;
   if(/^(?:[（(]?請注意[!！]|付款可使用|日幣[\/／]台幣皆可|合計後取最接近|金額已四捨五入|匯率已含代購報酬)/.test(line))continue;
   const cells=fields(line),nameIndex=cells.findIndex(c=>/^(?:商品(?:名稱|名)?|品名|名稱|name)$/i.test(c)),priceIndex=cells.findIndex(c=>/^(?:價格|單價|含稅單價|日幣單價|金額|price)$/i.test(c));if(nameIndex>=0&&priceIndex>=0){const q=cells.findIndex(c=>/^(?:數量|qty|quantity)$/i.test(c));header={name:nameIndex,price:priceIndex,qty:q>=0?q:null};continue}
   const item=parseLine(line,items.length,header);if(item.name.length>500)throw Error('商品描述太長，請分行貼上。');items.push(item);if(items.length>1000)throw Error('一份清單最多 1,000 項商品。')
  }
  if(!items.length)throw Error('沒有找到商品內容。');if(buyer.length>100)throw Error('訂購人姓名太長。');return{buyer,items}
 }
 root.ImportParser={parse,number};if(typeof module!=='undefined')module.exports=root.ImportParser;
})(typeof window==='undefined'?globalThis:window);
