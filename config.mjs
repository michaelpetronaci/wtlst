export function isPublicKey(key) {
 if(typeof key!=='string')return false;
 if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))return true;
 try {return key.split('.').length===3 && JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon';}catch{return false;}
}
export function publicConfig(env=process.env){
 const url=env.SUPABASE_URL||'',key=env.SUPABASE_ANON_KEY||'';
 if(!isPublicKey(key))throw new Error('SUPABASE_ANON_KEY must be a publishable or legacy anon key');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))throw new Error('Invalid SUPABASE_URL');
 return {url,key,privacyContact:env.PRIVACY_CONTACT||'',operator:env.SITE_OPERATOR||''};
}
export function backendConfig(env=process.env){
 const cfg=publicConfig(env),secret=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;
 if(!secret||(!secret.startsWith('sb_secret_')&&!isServiceJWT(secret)))throw new Error('Missing server Supabase secret');
 return {...cfg,secret};
}
function isServiceJWT(key){try{return JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='service_role';}catch{return false;}}
export function rpcClient(cfg,token,fetcher=fetch){return async(name,args={})=>{
 const key=token?cfg.key:cfg.secret;
 const headers={apikey:key,'Content-Type':'application/json'};
 if(token)headers.Authorization=`Bearer ${token}`;
 else if(!key.startsWith('sb_secret_'))headers.Authorization=`Bearer ${key}`;
 const response=await fetcher(`${cfg.url}/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify(args),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error(`Database operation ${name} failed (${response.status})`);
 return response.status===204?null:response.json();
};}
