// Inject a consent-only GA4 bootstrap into first-party HTML responses.
// The external Google tag is never referenced here or loaded until opt-in.
export function withAnalytics(html){
 if(typeof html!=='string'||!html.includes('</body>'))throw new Error('Expected WTLST HTML document');
 const tag='<script defer src="/analytics-client.js"></script>';
 if(html.includes(tag))throw new Error('Analytics bootstrap already inserted');
 return html.replace('</body>',tag+'</body>');
}
