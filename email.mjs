import {backendConfig,rpcClient} from './config.mjs';
import {timingSafeEqual} from 'node:crypto';
export function sameSecret(a,b){return !!a&&!!b&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export function emailPayload(job,env=process.env){
 const site=(env.SITE_URL||'https://thewtlst.com').replace(/\/$/,'');
 if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(site))throw new Error('Invalid SITE_URL');
 const from='WTLST <noreply@thewtlst.com>';
 if(!/^[^<>\r\n]*<[^<>\s]+@thewtlst\.com>$/.test(from)&&! /^[^<>\s]+@thewtlst\.com$/.test(from))throw new Error('EMAIL_FROM must use thewtlst.com');
 const member=String(job.member_number??'').padStart(6,'0');
 let subject,text,to=job.email;
 if(job.kind.startsWith('operator_')){
  to=env.ADMIN_NOTIFICATION_EMAIL||env.PRIVACY_CONTACT;
  subject=job.kind==='operator_admission'?`WTLST: member ${member} admitted`:'WTLST: new application';
  text=`${subject}\n\nReview the private dashboard: ${site}/?view=admin\n\nApplication #${job.applicant_id}.`;
 }else if(job.kind==='admission'){
  subject=`You’re in. WTLST MEMBER ${member}`;
  text=`You’re in.\n\nMEMBER ${member}\n\nOne invitation available. Choose well.\n\nView your membership: ${site}/?view=login\n\nWTLST membership is free.`;
 }else{
  subject='You’re on the WTLST.';
  text=`Your application is in.\n\nView your live position and get your referral link: ${site}/?view=login\n\nEvery verified referral improves your ranking score. Admission is not guaranteed.\n\nWTLST membership is free.`;
 }
 if(!to||!/^\S+@\S+\.\S+$/.test(to))throw new Error('Missing email recipient configuration');
 return {from,to:[to],subject,text,...(env.PRIVACY_CONTACT?{reply_to:env.PRIVACY_CONTACT}:{})};
}
export async function deliver({token,cron=false,env=process.env,fetcher=fetch}){
 const cfg=backendConfig(env);
 if(!env.RESEND_API_KEY)throw new Error('Missing RESEND_API_KEY');
 const call=rpcClient(cfg,null,fetcher);let applicant=null;
 if(!cron){
  if(!token)return {status:401,body:{error:'Sign in required'}};
  const auth=await fetcher(`${cfg.url}/auth/v1/user`,{headers:{apikey:cfg.key,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});
  if(!auth.ok)return {status:401,body:{error:'Sign in required'}};
  const me=await rpcClient(cfg,token,fetcher)('wtlst_me');
  if(!me.admin){if(!me.application)return {status:200,body:{sent:0,failed:0}};applicant=me.application.id;}
 }
 const jobs=await call('wtlst_email_claim',{p_applicant:applicant});let sent=0,failed=0;
 for(const job of jobs){
  try{
   const payload=await call('wtlst_email_prepare',{p_id:job.id,p_lease:job.lease,p_payload:job.payload||emailPayload(job,env)});
   const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`wtlst-${job.id}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw new Error(`Email provider returned ${response.status}`);
   const result=await response.json();if(!result.id)throw new Error('Email provider returned no receipt');
   await call('wtlst_email_finish',{p_id:job.id,p_lease:job.lease,p_provider_id:result.id});sent++;
  }catch(error){
   failed++;
   await call('wtlst_email_finish',{p_id:job.id,p_lease:job.lease,p_error:error.message.startsWith('Email provider')?error.message:'Delivery interrupted; retry pending'}).catch(()=>{});
  }
  if(jobs.length>1)await new Promise(resolve=>setTimeout(resolve,550));
 }
 return {status:failed?502:200,body:{sent,failed}};
}
