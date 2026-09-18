function parseKm(input){if(input==null||input==='')return null;if(typeof input==='number'){if(input>=1000)return Math.round(input);const w=Math.trunc(input);return w*1000+Math.round(Math.abs(input-w)*1000)}const raw=String(input).trim().replace(/\s/g,'');const p=raw.match(/^(\d{1,3})\+(\d{1,3})$/);if(p)return Number(p[1])*1000+Number(p[2].padStart(3,'0'));const s=raw.replace(',','.');if(/^\d+(?:\.\d+)?$/.test(s)){const[a,b='']=s.split('.');return Number(a)*1000+(b?Number(b.padEnd(3,'0').slice(0,3)):0)}return null}
function fmt(m){const k=Math.floor(m/1000),mm=m-k*1000;return`${String(k).padStart(3,'0')}+${String(mm).padStart(3,'0')}`}
const cases=[['118+780',118780],['118.780',118780],['118,780',118780],['118.78',118780],['98.13',98130],['098+130',98130]];
for(const[c,e]of cases){const got=parseKm(c);if(got!==e)throw new Error(`${c}: ${got} != ${e}`);console.log('OK',c,'=>',fmt(got))}
const d5={km:118780,explicit:'D5'};if(d5.explicit!=='D5')throw new Error('D5');console.log('OK D5 priority');
const area=30*6.8,vol=area*7,prod=102*14,tr=1428*.5;if(area!==204||vol!==1428||prod!==1428||tr!==714)throw new Error('memory');console.log('OK memory',area,vol,prod,tr);
