/**
 * Question Bank v6 — P0 FIXES:
 * 1. Padding loops: MAX_ITERS + emergency fallback — no infinite loop possible
 * 2. fracEquiv only for fraction topic (not division D3 "11 r 5", place_value "1, 4, 3")
 * 3. Cross-topic fallback removed — failures stay within same topic
 */
const rand=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
const shuffle=arr=>[...arr].sort(()=>Math.random()-0.5);
function gcd(a,b){return b===0?a:gcd(b,a%b);}
function lcm(a,b){return(a*b)/gcd(a,b);}
function simplify(n,d){const g=gcd(Math.abs(n),Math.abs(d));return[n/g,d/g];}

// parseFraction: only returns numeric if full string is a fraction format
function parseFraction(str){
  const s=String(str).trim();
  const mix=s.match(/^(\d+)\s+and\s+(\d+)\/(\d+)$/);if(mix)return parseInt(mix[1])+parseInt(mix[2])/parseInt(mix[3]);
  const frac=s.match(/^(-?\d+)\/(\d+)$/);if(frac)return parseInt(frac[1])/parseInt(frac[2]);
  const num=parseFloat(s);
  // Only numeric if the whole string is the number (prevents "11 r 5" → 11)
  return(String(num)===s||String(num)===s.replace(/\.0$/,''))?num:NaN;
}
function fracEquiv(a,b){const va=parseFraction(String(a)),vb=parseFraction(String(b));return!isNaN(va)&&!isNaN(vb)&&Math.abs(va-vb)<0.00001;}

// buildOptions: topic-aware equivalence, guaranteed 4 options, no infinite loop
function buildOptions(answer,distractors,isFractionTopic=false){
  const ansStr=String(answer);
  const isEquiv=isFractionTopic?(a,b)=>fracEquiv(String(a),String(b)):(a,b)=>String(a).trim()===String(b).trim();
  const unique=[ansStr];
  for(const d of distractors){if(unique.length>=4)break;const dStr=String(d);if(!unique.some(u=>isEquiv(u,dStr)))unique.push(dStr);}
  // Safe padding
  const numAns=parseFloat(ansStr),isNum=!isNaN(numAns)&&(String(numAns)===ansStr||String(Math.round(numAns))===ansStr);
  let offset=1,MAX=80;
  while(unique.length<4&&MAX-->0){
    const c=isNum?String(offset%2===0?numAns+Math.ceil(offset/2):Math.max(0,numAns-Math.ceil(offset/2))):String(9000+offset);
    offset++;if(!unique.some(u=>isEquiv(u,c)))unique.push(c);
  }
  let em=100000;while(unique.length<4)unique.push(String(em++));
  return shuffle(unique).slice(0,4);
}

// validateQ: fraction semantic check only for fraction topic
function validateQ(q,isFractionTopic=false){
  if(!q||(q.answer===undefined&&q.answer!==0))return false;
  if(q.type==='input')return!!q.text;
  if(!Array.isArray(q.options)||q.options.length<4)return false;
  const strs=q.options.map(String);
  if(new Set(strs).size<4)return false;
  if(!strs.includes(String(q.answer)))return false;
  if(isFractionTopic){for(let i=0;i<strs.length;i++)for(let j=i+1;j<strs.length;j++)if(fracEquiv(strs[i],strs[j]))return false;}
  return true;
}

// safeGen: topic-aware, safe padding, guaranteed termination
function safeGen(fn,topic,maxTries=8){
  const isFrac=topic==='fractions';
  for(let i=0;i<maxTries;i++){
    try{
      const raw=fn();if(!raw)continue;
      if(raw.options){
        raw.options=raw.options.map(String);
        const seen=new Set();raw.options=raw.options.filter(o=>{const k=String(o);if(seen.has(k))return false;seen.add(k);return true;});
        const numAns=parseFloat(raw.answer),isNum=!isNaN(numAns);
        let pad=1,tries=0;while(raw.options.length<4&&tries++<60){const c=isNum?String(numAns+pad):String(9000+pad);pad++;if(!raw.options.includes(c))raw.options.push(c);}
        let em=100000;while(raw.options.length<4)raw.options.push(String(em++));
        raw.options=shuffle(raw.options).slice(0,4);
        if(!raw.options.includes(String(raw.answer))){raw.options[rand(0,3)]=String(raw.answer);raw.options=shuffle(raw.options);}
      }
      if(validateQ(raw,isFrac))return raw;
    }catch{}
  }
  return null;
}

const counting={
  1:()=>{const n=rand(1,9),a=n+1;return{text:`What number comes after ${n}?`,answer:String(a),options:buildOptions(a,[n+2,n-1,n,n+3]),type:'mcq',hint:`Count: ${n-1}, ${n}, ____`,visual:'number_line',visualData:{n},learningObjective:'Count forward by 1'};},
  2:()=>{const n=rand(3,15),e=['⭐','🌙','🍎','🐸','🎈'][rand(0,4)];return{text:`How many ${e}?\n${Array(n).fill(e).join(' ')}`,answer:String(n),options:buildOptions(n,[n+1,n-1,n+2,n-2].filter(x=>x>0)),type:'mcq',hint:'Count each one',learningObjective:'Count objects accurately'};},
  3:()=>{const s=rand(10,40),st=rand(2,5),ans=s+4*st;return{text:`What comes next?\n${s}, ${s+st}, ${s+2*st}, ${s+3*st}, ____`,answer:String(ans),options:buildOptions(ans,[ans+1,ans-1,ans+st,ans-st]),type:'mcq',hint:`+${st} each time`,learningObjective:'Continue skip-counting patterns'};},
  4:()=>{const n=rand(50,195),step=[5,10,25][rand(0,2)],ans=n+step;return{text:`Count by ${step}s. After ${n}?`,answer:String(ans),options:buildOptions(ans,[n+step*2,n,n+1,n+step-1]),type:'mcq',hint:`Add ${step}`,learningObjective:`Skip count by ${step}s`};},
  5:()=>{const n=rand(100,500),ans=n+100;return{text:`Count by 100s. After ${n}?`,answer:String(ans),options:buildOptions(ans,[n+10,n+1000,n,n+200]),type:'mcq',hint:'Hundreds digit +1',learningObjective:'Skip count by 100s'};},
};
const addition={
  1:()=>{const a=rand(1,5),b=rand(1,5),ans=a+b;return{text:`${a} + ${b} = ?`,answer:String(ans),options:buildOptions(ans,[Math.abs(a-b),ans+1,ans-1,a]),type:'mcq',hint:`Start at ${a}, count up ${b}`,visual:'dots',visualData:{a,b},learningObjective:'Add single-digit numbers'};},
  2:()=>{const a=rand(5,15),b=rand(5,15),ans=a+b;return{text:`${a} + ${b} = ?`,answer:String(ans),options:buildOptions(ans,[ans-10,ans+10,Math.abs(a-b),ans+1]),type:'mcq',hint:'Start at bigger, count up',learningObjective:'Add two-digit numbers'};},
  3:()=>{const a=rand(20,79),b=rand(20,79),ans=a+b;return{text:`${a} + ${b} = ?`,answer:String(ans),options:buildOptions(ans,[ans-10,ans+10,ans-1,ans+1]),type:'mcq',hint:`Tens: ${Math.floor(a/10)*10}+${Math.floor(b/10)*10}, Ones: ${a%10}+${b%10}`,learningObjective:'Add with regrouping'};},
  4:()=>{const a=rand(100,899),b=rand(100,899);return{text:`${a} + ${b} = ?`,answer:String(a+b),type:'input',hint:'Column by column',learningObjective:'Add three-digit numbers'};},
  5:()=>{const n=[rand(200,800),rand(200,800),rand(200,800)];return{text:`${n[0]} + ${n[1]} + ${n[2]} = ?`,answer:String(n.reduce((s,x)=>s+x,0)),type:'input',hint:'Add first two, then third',learningObjective:'Add three multi-digit numbers'};},
};
const subtraction={
  1:()=>{const b=rand(1,4),a=rand(b+1,b+5),ans=a-b;return{text:`${a} - ${b} = ?`,answer:String(ans),options:buildOptions(ans,[a+b,ans+1,ans-1,b]),type:'mcq',hint:`Count back ${b} from ${a}`,visual:'number_line',visualData:{n:a},learningObjective:'Subtract within 10'};},
  2:()=>{const b=rand(3,9),a=rand(b+2,20),ans=a-b;return{text:`${a} - ${b} = ?`,answer:String(ans),options:buildOptions(ans,[a+b,ans+1,ans-1,b]),type:'mcq',hint:`? + ${b} = ${a}`,learningObjective:'Subtract from two-digit'};},
  3:()=>{const b=rand(10,45),a=rand(b+10,99),ans=a-b;return{text:`${a} - ${b} = ?`,answer:String(ans),options:buildOptions(ans,[a+b,ans+10,ans-10,ans+1]),type:'mcq',hint:'Tens then ones',learningObjective:'Subtract with regrouping'};},
  4:()=>{const b=rand(100,499),a=rand(b+100,999);return{text:`${a} - ${b} = ?`,answer:String(a-b),type:'input',hint:'Borrow if needed',learningObjective:'Subtract three-digit numbers'};},
  5:()=>{const b=rand(1000,4999),a=rand(b+500,9999);return{text:`${a} - ${b} = ?`,answer:String(a-b),type:'input',hint:'Standard algorithm',learningObjective:'Subtract multi-digit numbers'};},
};
const multiplication={
  1:()=>{const a=rand(2,5),b=rand(2,5),ans=a*b;return{text:`${a} × ${b} = ?`,answer:String(ans),options:buildOptions(ans,[a+b,a*(b+1),a*(b-1),(a+1)*b]),type:'mcq',hint:`${b} groups of ${a}`,visual:'array',visualData:{rows:a,cols:b},learningObjective:'Multiplication as repeated addition'};},
  2:()=>{const a=rand(3,9),b=rand(3,9),ans=a*b;return{text:`${a} × ${b} = ?`,answer:String(ans),options:buildOptions(ans,[a+b,a*(b+1),(a+1)*b,a*b+a]),type:'mcq',hint:`${a} times table`,learningObjective:'Recall multiplication facts to 10×10'};},
  3:()=>{const a=rand(10,12),b=rand(3,12),ans=a*b,pe=10*b+(a-10);return{text:`${a} × ${b} = ?`,answer:String(ans),options:buildOptions(ans,[pe!==ans?pe:ans+b,a+b,(a-1)*b,a*(b-1)]),type:'mcq',hint:`(10×${b})+(${a-10}×${b})`,learningObjective:'Multiply using distributive property'};},
  4:()=>{const a=rand(15,99),b=rand(3,9);return{text:`${a} × ${b} = ?`,answer:String(a*b),type:'input',hint:'Ones then tens digit',learningObjective:'Multiply two-digit by one-digit'};},
  5:()=>{const a=rand(12,49),b=rand(11,49);return{text:`${a} × ${b} = ?`,answer:String(a*b),type:'input',hint:'Long multiplication',learningObjective:'Multiply two-digit by two-digit'};},
};
const division={
  1:()=>{const b=rand(2,5),q=rand(2,5);return{text:`${b*q} ÷ ${b} = ?`,answer:String(q),options:buildOptions(q,[b*q,q+1,q-1,b]),type:'mcq',hint:`Groups of ${b} in ${b*q}?`,visual:'groups',visualData:{total:b*q,groupSize:b},learningObjective:'Division as equal sharing'};},
  2:()=>{const b=rand(3,9),q=rand(2,9);return{text:`${b*q} ÷ ${b} = ?`,answer:String(q),options:buildOptions(q,[b*q,q+1,q-1,b+q]),type:'mcq',hint:`${b} × ? = ${b*q}`,learningObjective:'Use multiplication to divide'};},
  3:()=>{
    // FIX: remainder answers like "11 r 5" use plain string equality (not fracEquiv)
    const b=rand(3,8),q=rand(10,20),r=rand(1,b-1),a=b*q+r;
    const ans=`${q} r ${r}`,d2=`${q+1} r ${r}`,d3=r<b-1?`${q} r ${r+1}`:`${q} r ${r-1||1}`,d4=`${Math.max(1,q-1)} r ${r}`;
    return{text:`${a} ÷ ${b} = ? remainder ?`,answer:ans,options:buildOptions(ans,[d2,d3,d4],false),type:'mcq',hint:`${b}×${q}=${b*q}, rem=${a-b*q}`,learningObjective:'Divide with remainders'};
  },
  4:()=>{const b=rand(4,9),q=rand(12,99);return{text:`${b*q} ÷ ${b} = ?`,answer:String(q),type:'input',hint:'Long division',learningObjective:'Divide three-digit by one-digit'};},
  5:()=>{const b=rand(11,25),q=rand(10,50);return{text:`${b*q} ÷ ${b} = ?`,answer:String(q),type:'input',hint:`Estimate ${b}s`,learningObjective:'Divide by two-digit numbers'};},
};
const fractions={
  1:()=>{const d=[2,3,4][rand(0,2)],n=rand(1,d-1),ans=`${n}/${d}`;return{text:`Which fraction shows ${n} shaded out of ${d} equal parts?`,answer:ans,options:buildOptions(ans,[`${d}/${n}`,`${n+1<d?n+1:1}/${d}`,`${n}/${d+1}`,`${Math.max(1,n-1)}/${d}`],true),type:'mcq',hint:`Top=${n}, Bottom=${d}`,visual:'fraction_bar',visualData:{num:n,den:d},learningObjective:'Identify fractions'};},
  2:()=>{const d=[4,6,8][rand(0,2)],n1=rand(1,d-2),n2=n1+rand(1,d-n1-1);return{text:`Which is bigger: ${n1}/${d} or ${n2}/${d}?`,answer:`${n2}/${d}`,options:[`${n1}/${d}`,`${n2}/${d}`,'Equal','Cannot tell'],type:'mcq',hint:'Same denom — compare tops',learningObjective:'Compare fractions'};},
  3:()=>{
    const d=[4,6,8][rand(0,2)],n1=rand(1,Math.floor(d/2)),n2=rand(1,Math.floor(d/2)),sum=n1+n2,w=Math.floor(sum/d),r=sum%d;
    const ans=r===0?String(w):w>0?`${w} and ${r}/${d}`:`${sum}/${d}`;
    const addDenom=`${sum}/${d*2}`;const wrongSimp=`${sum+1}/${d}`;
    return{text:`${n1}/${d} + ${n2}/${d} = ?`,answer:ans,options:buildOptions(ans,[addDenom,wrongSimp,`${Math.max(0,sum-1)}/${d}`],true),type:'mcq',hint:`Add ONLY tops: ${n1}+${n2}=${sum}`,learningObjective:'Add same-denominator fractions'};
  },
  4:()=>{
    const d=[3,4,6][rand(0,2)],n=rand(1,d-1),m=rand(2,5),rawN=n*m;const[sn,sd]=simplify(rawN,d);
    const ans=sd===1?String(sn):`${sn}/${sd}`;
    return{text:`${n}/${d} × ${m} = ?`,answer:ans,options:buildOptions(ans,[`${rawN}/${d*m}`,`${n+m}/${d}`,`${rawN}/${d}`],true),type:'mcq',hint:`Multiply only numerator: ${n}×${m}=${rawN}`,learningObjective:'Multiply fraction by whole number'};
  },
  5:()=>{
    const pairs=[[1,2,1,3],[1,3,1,4],[2,3,1,4],[1,4,1,6],[1,3,2,5]];
    const[n1,d1,n2,d2]=pairs[rand(0,pairs.length-1)];const L=lcm(d1,d2),sn=n1*(L/d1)+n2*(L/d2);
    const[rn,rd]=simplify(sn,L);const ans=rd===1?String(rn):`${rn}/${rd}`;
    return{text:`${n1}/${d1} + ${n2}/${d2} = ?`,answer:ans,options:buildOptions(ans,[`${n1+n2}/${d1+d2}`,`${sn}/${L}`,`${n1*n2}/${d1*d2}`],true),type:'mcq',hint:`LCD=${L}`,learningObjective:'Add different-denominator fractions'};
  },
};
const place_value={
  1:()=>{const n=rand(10,99),o=n%10,t=Math.floor(n/10),isO=Math.random()>0.5,d=isO?o:t,w=isO?t:o;return{text:`In ${n}, ${isO?'ones':'tens'} digit?`,answer:String(d),options:buildOptions(d,[w,d+1,Math.max(0,d-1),rand(0,9)]),type:'mcq',hint:`${n}=${t} tens + ${o} ones`,learningObjective:'Identify digits'};},
  2:()=>{
    const n=rand(100,999),h=Math.floor(n/100),t=Math.floor((n%100)/10),o=n%10,ans=`${h}, ${t}, ${o}`;
    // FIX: place_value D2 uses plain string equality (not fracEquiv) — "1, 4, 3" != "1, 2, 3"
    return{text:`${n} = ___ hundreds + ___ tens + ___ ones`,answer:ans,options:buildOptions(ans,[`${t}, ${h}, ${o}`,`${h+1}, ${t}, ${o}`,`${h}, ${o}, ${t}`],false),type:'mcq',hint:`${h*100}+${t*10}+${o}`,learningObjective:'Decompose by place value'};
  },
  3:()=>{const n=rand(1000,9999),pl=[['thousands',1000],['hundreds',100],['tens',10],['ones',1]][rand(0,3)],[pn,pv]=pl,digit=Math.floor(n/pv)%10,val=digit*pv;return{text:`In ${n}, VALUE of ${pn} digit?`,answer:String(val),options:buildOptions(val,[digit,val+pv,val-pv>0?val-pv:val+pv*2,digit*pv*10]),type:'mcq',hint:`${digit}×${pv}=${val}`,learningObjective:'Digit vs place value'};},
  4:()=>{const n=rand(10000,99999),rv=[100,1000,10000][rand(0,2)],rn=Math.round(n/rv)*rv;return{text:`Round ${n} to nearest ${rv.toLocaleString()}`,answer:String(rn),options:buildOptions(rn,[rn-rv,rn+rv,Math.floor(n/rv)*rv,n]),type:'mcq',hint:'≥5 round up',learningObjective:'Round numbers'};},
  5:()=>{const n=rand(1000,9999),pts=[],vs=[1000,100,10,1];let rm=n;for(const v of vs){const d=Math.floor(rm/v);if(d>0)pts.push(`${d*v}`);rm%=v;}const exp=pts.join(' + ');return{text:`Expanded form of ${n}?`,answer:exp,options:buildOptions(exp,[pts.map((p,i)=>i===0?String(parseInt(p)+1000):p).join(' + '),String(n),pts.slice(0,-1).join(' + ')||'0'],false),type:'mcq',hint:'Value of each digit',learningObjective:'Expanded form'};},
};
const WP={add:[(a,b)=>({t:`Maya has ${a} apples. Gets ${b} more. How many now?`,a:a+b,ws:Math.abs(a-b),wm:a*b}),(a,b)=>({t:`${a} red + ${b} blue birds. Total?`,a:a+b,ws:Math.abs(a-b),wm:a*b})],sub:[(a,b)=>({t:`${a+b} oranges, ${b} eaten. Left?`,a,wa:a+b+b,wm:(a+b)*b}),(a,b)=>({t:`Had $${a+b}, spent $${b}. Left?`,a,wa:a+2*b,wm:b})],mul:[(a,b)=>({t:`${a} bags, ${b} cookies each. Total?`,a:a*b,wa:a+b,ws:Math.abs(a-b)}),(a,b)=>({t:`${a} rows, ${b} desks each. Total?`,a:a*b,wa:a+b,ws:Math.abs(a-b)})],div:[(a,b)=>({t:`${a*b} students, groups of ${b}. Groups?`,a,wm:a*b*b,wa:a*b+b}),(a,b)=>({t:`${a*b} cookies among ${b} kids. Each?`,a,wm:a*b*b,wa:a*b+b})]};
const word_problems={
  1:()=>{const a=rand(1,8),b=rand(1,8),t=WP.add[rand(0,1)](a,b);return{text:t.t,answer:String(t.a),options:buildOptions(t.a,[t.ws,t.wm,t.a+1]),type:'mcq',hint:'"Gets more" → add',learningObjective:'Addition word problems'};},
  2:()=>{const a=rand(5,20),b=rand(5,20),useAdd=Math.random()>0.5,pool=useAdd?WP.add:WP.sub,t=pool[rand(0,1)](a,b);return{text:t.t,answer:String(t.a),options:buildOptions(t.a,[t.wa||t.ws,t.wm||a*b,t.a+1]),type:'mcq',hint:'"Left?" sub. "Total?" add.',learningObjective:'Choose correct operation'};},
  3:()=>{const a=rand(2,8),b=rand(2,8),t=WP.mul[rand(0,1)](a,b);return{text:t.t,answer:String(t.a),options:buildOptions(t.a,[t.wa,t.ws,t.a+b]),type:'mcq',hint:'Each group → multiply',learningObjective:'Multiplication word problems'};},
  4:()=>{const a=rand(10,30),b=rand(3,8),t=WP.div[rand(0,1)](a,b);return{text:t.t,answer:String(t.a),options:buildOptions(t.a,[t.wm,t.wa,a*b]),type:'mcq',hint:'Shared equally → divide',learningObjective:'Division word problems'};},
  5:()=>{const a=rand(5,15),b=rand(2,6),c=rand(2,5),ans=a*b-c;return{text:`${a} buses × ${b} students − ${c} absent = ?`,answer:String(ans),options:buildOptions(ans,[a*b,a+b-c,ans+c]),type:'mcq',hint:`${a}×${b}=${a*b}, −${c}=${ans}`,learningObjective:'Two-step word problems'};},
};
const GENERATORS={counting,addition,subtraction,multiplication,division,fractions,place_value,word_problems};
const SAFE={counting:'What comes after 5?|6|7,4,5',addition:'3 + 4 = ?|7|6,8,5',subtraction:'8 - 3 = ?|5|4,6,11',multiplication:'2 × 3 = ?|6|5,8,3',division:'6 ÷ 2 = ?|3|4,2,12',fractions:'1 out of 2 parts?|1/2|1/3,2/1,1/4',place_value:'Tens digit in 45?|4|5,9,0',word_problems:'3 apples + 2 more = ?|5|6,1,4'};
export function generateQuestion(topic,difficulty){
  const fn=GENERATORS[topic]?.[difficulty];
  if(!fn){for(let d=difficulty-1;d>=1;d--)if(GENERATORS[topic]?.[d])return generateQuestion(topic,d);}
  const raw=fn?safeGen(fn,topic):null;
  if(!raw){if(difficulty>1)return generateQuestion(topic,difficulty-1);const[text,answer,opts]=(SAFE[topic]||SAFE.addition).split('|');return{id:`${topic}_safe_${Date.now()}`,topic,difficulty:1,type:'mcq',text,answer,options:shuffle([answer,...opts.split(',')]).slice(0,4),hint:'Think carefully!'};}
  return{id:`${topic}_${difficulty}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,topic,difficulty,...raw,answer:String(raw.answer),options:raw.options?.map(String)};
}
