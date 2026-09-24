export const percent=(n,d)=>d?Math.round(1000*n/d)/10:0;
export function weeklyReport(g){
 const s=g.snapshot,w=g.periods.last7,p=g.periods.previous7;
 const sources=[['direct',w.direct],['referral',w.referral],['invitation',w.invitation]].sort((a,b)=>b[1]-a[1]);
 const signals=[];
 if(w.applications===0)signals.push('No verified applications this week.');
 else if(sources[0][1]===sources[1][1])signals.push('No single strongest acquisition source.');
 else signals.push(`Strongest acquisition source: ${sources[0][0]} (${sources[0][1]} applications).`);
 // Descriptive comparison only; never claim statistical significance from a small sample.
 if(p.applications>=10&&w.applications>=10){const change=Math.round(100*(w.applications-p.applications)/p.applications);if(Math.abs(change)>=20)signals.push(`Applications ${change>0?'increased':'decreased'} ${Math.abs(change)}% versus the previous week (descriptive, not a significance test).`);}
 if(s.invitations>=5&&percent(s.redeemed,s.invitations)<20)signals.push('Invitation redemption is below 20%; recently issued invitations may not have had time to be used.');
 let action='No intervention — observe another week before drawing conclusions.';
 if(w.applications===0)action='Share the public application link with 5 relevant people.';
 else if(s.invitations>=5&&s.unused>=3&&percent(s.redeemed,s.invitations)<20)action='Personally contact 3 members whose invitations remain unused.';
 else if(w.invitation_admissions>=3)action='No intervention — invitation growth is propagating.';
 else if(w.members===0&&s.waiting>=5)action='Review 5 waiting applications for admission.';
 const signed=n=>`${n>=0?'+':''}${n}`;
 return `WTLST — Weekly Growth\nWeek ending ${new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'short',day:'2-digit'}).format(new Date(g.as_of))} (Europe/Rome boundary)\n\nMembers: ${s.members} (${signed(w.members)})\nWaiting: ${s.waiting} (${signed(w.waiting_change)})\nApplications this week: ${w.applications}\nReferral applications: ${w.referral}\nInvitation admissions: ${w.invitation_admissions}\nDirect applications: ${w.direct}\nInvite redemption rate: ${percent(s.redeemed,s.invitations)}%\nUnused invitations: ${s.unused}\n\nGrowth signals:\n${signals.join('\n')}\n\nSuggested founder action:\n${action}`;
}
