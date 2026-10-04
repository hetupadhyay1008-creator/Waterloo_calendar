import {refresh} from '@/lib/calendar';
export async function POST(){try{return Response.json(await refresh());}catch(e){return Response.json({error:e instanceof Error?e.message:'Refresh failed.'},{status:502});}}
