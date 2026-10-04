import ICAL from 'ical.js';
import { env } from 'cloudflare:workers';
export type ClassEvent = {id:string;title:string;start:string;end:string;room:string;allDay:boolean};
export function database(){if(!env.DB)throw new Error('Schedule storage is temporarily unavailable.');return env.DB;}
export function feedUrl(value:string){const u=new URL(value.trim().replace(/^webcal:/i,'https:'));if(u.protocol!=='https:'||!(u.hostname==='uwaterloo.ca'||u.hostname.endsWith('.uwaterloo.ca'))||u.username||u.password||(u.port&&u.port!=='443'))throw new Error('Use the HTTPS calendar subscription link exported by Waterloo Portal.');return u.href;}
export async function fetchCalendarResponse(value:string){
 let url=feedUrl(value);
 const signal=AbortSignal.timeout(20000);
 for(let redirects=0;redirects<=5;redirects++){
  const response=await fetch(url,{redirect:'manual',signal,headers:{Accept:'text/calendar'}});
  if(![301,302,303,307,308].includes(response.status))return response;
  const location=response.headers.get('location');
  await response.body?.cancel();
  if(!location)throw new Error('Portal returned a redirect without a destination. Check your calendar subscription link.');
  if(redirects===5)throw new Error('Portal redirected too many times. Check your calendar subscription link.');
  url=feedUrl(new URL(location,url).href);
 }
 throw new Error('Could not fetch the Portal calendar.');
}
export function range(now=new Date()){const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);const from=new Date(day+'T00:00:00Z');const to=new Date(from);to.setUTCMonth(to.getUTCMonth()+1);to.setUTCDate(to.getUTCDate()+1);return {from:new Date(from.getTime()-86400000),to,day};}
function jsDate(t:ICAL.Time){if(t.zone===ICAL.Timezone.localTimezone&&!t.isDate){const guess=Date.UTC(t.year,t.month-1,t.day,t.hour,t.minute,t.second);const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess)).map(x=>[x.type,x.value]));return new Date(guess+guess-Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second));}return t.toJSDate();}
export function parseCalendar(source:string,now=new Date()):ClassEvent[]{
 const root=new ICAL.Component(ICAL.parse(source));if(root.name!=='vcalendar')throw new Error('The link did not return an iCal calendar.');
 for(const zone of root.getAllSubcomponents('vtimezone')){const id=zone.getFirstPropertyValue('tzid');if(id)ICAL.TimezoneService.register(new ICAL.Timezone({component:zone,tzid:String(id)}));}
 const components=root.getAllSubcomponents('vevent');const output:ClassEvent[]=[];const {from,to}=range(now);let steps=0;
 for(const c of components){if(c.hasProperty('recurrence-id'))continue;const ev=new ICAL.Event(c);for(const other of components)if(other.hasProperty('recurrence-id')&&other.getFirstPropertyValue('uid')===ev.uid)ev.relateException(new ICAL.Event(other));
 const emit=(start:ICAL.Time,end:ICAL.Time,item:ICAL.Event)=>{if(String(item.component.getFirstPropertyValue('status')).toUpperCase()==='CANCELLED')return;const a=jsDate(start),b=jsDate(end);if(a<from||a>=to)return;output.push({id:ev.uid+'|'+start.toString(),title:item.summary||'Class',start:start.isDate?start.toString():a.toISOString(),end:end.isDate?end.toString():b.toISOString(),room:item.location||'Room not listed',allDay:start.isDate});};
 if(ev.isRecurring()){const it=ev.iterator();let occurrence;while((occurrence=it.next())){if(++steps>100000)throw new Error('Calendar has too many recurring events.');if(jsDate(occurrence)>to)break;const d=ev.getOccurrenceDetails(occurrence);emit(d.startDate,d.endDate,d.item);}}else emit(ev.startDate,ev.endDate,ev);
 }return output.sort((a,b)=>a.start.localeCompare(b.start));
}
export async function fetchEvents(url:string){const r=await fetchCalendarResponse(url);if(!r.ok)throw new Error('Portal could not provide the calendar. Check your subscription link and retry.');if(Number(r.headers.get('content-length'))>2000000)throw new Error('Calendar is too large.');const reader=r.body?.getReader();if(!reader)throw new Error('Portal returned an empty response.');let size=0;const parts:Uint8Array[]=[];while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>2000000){await reader.cancel();throw new Error('Calendar is too large.');}parts.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}return parseCalendar(new TextDecoder().decode(bytes));}
export async function refresh(){const db=database();const row=await db.prepare('SELECT feed,events FROM calendar WHERE id=1').first<{feed:string;events:string}>();if(!row)return {connected:false,reason:'Connect a Portal calendar in the app to start automatic updates.'};try{const events=await fetchEvents(row.feed);const old=JSON.parse(row.events) as ClassEvent[];const {day}=range();const current=events.filter(e=>e.start.slice(0,10)>=day),previous=old.filter(e=>e.start.slice(0,10)>=day);const changes:string[]=[];const oldMap=new Map(previous.map(e=>[e.id,e])),nextMap=new Map(current.map(e=>[e.id,e]));for(const e of current){const before=oldMap.get(e.id);if(!before)changes.push('Added: '+e.title);else if(JSON.stringify(before)!==JSON.stringify(e))changes.push('Updated: '+e.title);}for(const e of previous)if(!nextMap.has(e.id))changes.push('Removed: '+e.title);const syncedAt=new Date().toISOString();await db.prepare('UPDATE calendar SET events=?,changes=?,synced_at=?,error=NULL WHERE id=1').bind(JSON.stringify(events),JSON.stringify(changes),syncedAt).run();return {connected:true,syncedAt,eventCount:events.length,changes};}catch{await db.prepare('UPDATE calendar SET error=? WHERE id=1').bind('Refresh failed. Your last successful schedule is preserved. Check the Portal link and retry.').run();throw new Error('Refresh failed. Your last successful schedule is preserved.');}}

