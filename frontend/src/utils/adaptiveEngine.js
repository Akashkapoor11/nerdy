export const TOPICS = {
  counting:       { name: 'Counting',       emoji: '🔢', color: '#FF6B9D', grades: [0,1,2] },
  addition:       { name: 'Addition',       emoji: '➕', color: '#00CEC9', grades: [0,1,2,3,4,5] },
  subtraction:    { name: 'Subtraction',    emoji: '➖', color: '#74B9FF', grades: [1,2,3,4,5] },
  multiplication: { name: 'Multiplication', emoji: '✖️', color: '#A29BFE', grades: [2,3,4,5] },
  division:       { name: 'Division',       emoji: '➗', color: '#FD79A8', grades: [3,4,5] },
  fractions:      { name: 'Fractions',      emoji: '½',  color: '#FDCB6E', grades: [3,4,5] },
  place_value:    { name: 'Place Value',    emoji: '🏛️', color: '#55EFC4', grades: [1,2,3,4,5] },
  word_problems:  { name: 'Word Problems',  emoji: '📖', color: '#E17055', grades: [2,3,4,5] },
};
const BKT = { p_learn:0.25, p_guess:0.20, p_slip:0.10 };
const GRADE_DIFFICULTY_MAP = {
  0:{counting:2,addition:1},
  1:{counting:3,addition:2,subtraction:1,place_value:1},
  2:{counting:4,addition:3,subtraction:2,place_value:2,multiplication:1,word_problems:1},
  3:{addition:4,subtraction:3,multiplication:2,division:1,fractions:1,place_value:3,word_problems:2},
  4:{addition:5,subtraction:4,multiplication:3,division:2,fractions:2,place_value:4,word_problems:3},
  5:{multiplication:4,division:3,fractions:3,word_problems:4,place_value:5,addition:5,subtraction:5},
};
const MASTERY_GATE=0.60;
function parseSkillKey(key){const i=key.lastIndexOf('_');return{topic:key.slice(0,i),difficulty:parseInt(key.slice(i+1),10)};}
export function getTopicsForGrade(grade){return Object.entries(TOPICS).filter(([,i])=>i.grades.includes(grade)).map(([k])=>k);}
export function getMaxDifficulty(topic,grade){return GRADE_DIFFICULTY_MAP[grade]?.[topic]||0;}
export function getEligibleTopicCount(grade){return getTopicsForGrade(grade).length;}
function isDifficultyUnlocked(state,topic,d){if(d<=1)return true;const prev=state[`${topic}_${d-1}`];return prev&&prev.attempts>0&&prev.p_know>=MASTERY_GATE;}
export function updateKnowledge(state,topic,difficulty,isCorrect){
  const key=`${topic}_${difficulty}`;const skill=state[key]||{p_know:0.1,attempts:0,correct:0,streak:0};
  const{p_learn,p_guess,p_slip}=BKT;const p=skill.p_know;
  let post;
  if(isCorrect){const ev=p*(1-p_slip)+(1-p)*p_guess;post=ev>0?(p*(1-p_slip))/ev:p;}
  else{const ev=p*p_slip+(1-p)*(1-p_guess);post=ev>0?(p*p_slip)/ev:p;}
  const next=Math.min(0.99,Math.max(0.01,post+p_learn*(1-post)));
  return{...state,[key]:{p_know:next,attempts:skill.attempts+1,correct:skill.correct+(isCorrect?1:0),streak:isCorrect?(skill.streak||0)+1:0,last_seen:Date.now()}};
}
function candidateScore(skill){const p=skill.p_know,seen=skill.attempts>0;
  if(seen&&p<0.30)return 200+(0.30-p)*200;
  if(seen&&p>=0.30&&p<0.60)return 120+(0.60-p)*200;
  if(seen&&p>=0.60&&p<0.90)return 80;
  if(!seen)return 50;
  return 15;
}
export function selectNextQuestion(state,grade,sessionHistory=[],remediationTarget=null){
  const topics=getTopicsForGrade(grade);
  if(remediationTarget){
    const{topic,difficulty}=remediationTarget;
    if(topics.includes(topic)&&isDifficultyUnlocked(state,topic,difficulty)){
      const skill=state[`${topic}_${difficulty}`]||{p_know:0.1};
      const pct=Math.round(skill.p_know*100);
      return{topic,difficulty,mastery:skill.p_know,zone:'remediation',
        reason:`🎯 Targeted practice on ${TOPICS[topic].name} Level ${difficulty} (${pct}%) — building understanding!`,
        reasonShort:`${TOPICS[topic].emoji} Targeted practice`};
    }
  }
  const recentKeys=new Set(sessionHistory.slice(-3).map(h=>`${h.topic}_${h.difficulty}`));
  const candidates=[];
  for(const topic of topics){const maxDiff=getMaxDifficulty(topic,grade);for(let d=1;d<=maxDiff;d++){
    if(!isDifficultyUnlocked(state,topic,d))continue;
    if(recentKeys.has(`${topic}_${d}`))continue;
    const skill=state[`${topic}_${d}`]||{p_know:0.1,attempts:0,last_seen:null};
    let score=candidateScore(skill);
    if(!sessionHistory.find(h=>h.topic===topic))score+=10;
    candidates.push({topic,difficulty:d,score,mastery:skill.p_know,attempts:skill.attempts});
  }}
  if(!candidates.length)return{topic:topics[0],difficulty:1,reason:"Let's start! 🚀",reasonShort:'New challenge',zone:'new'};
  const total=candidates.reduce((s,c)=>s+c.score,0);let rand=Math.random()*total,selected=candidates[candidates.length-1];
  for(const c of candidates){rand-=c.score;if(rand<=0){selected=c;break;}}
  return{...selected,...buildReason(selected)};
}
function buildReason({topic,difficulty,mastery,attempts}){
  const info=TOPICS[topic],pct=Math.round((mastery||0)*100);
  if(attempts===0)return{reason:`🗺️ New skill! Let's explore ${info.name}!`,reasonShort:`${info.emoji} New`,zone:'new'};
  if(mastery<0.30)return{reason:`💪 ${info.name} Level ${difficulty} needs practice (${pct}%)!`,reasonShort:`${info.emoji} Needs practice`,zone:'weak'};
  if(mastery<0.60)return{reason:`📈 Building ${info.name} Level ${difficulty} (${pct}%)!`,reasonShort:`${info.emoji} Building`,zone:'learning'};
  if(mastery<0.90)return{reason:`🌟 Almost mastered ${info.name} Level ${difficulty} (${pct}%)!`,reasonShort:`${info.emoji} Almost there`,zone:'consolidating'};
  return{reason:`🏆 ${info.name} Level ${difficulty} mastered (${pct}%)!`,reasonShort:`${info.emoji} Challenge`,zone:'expert'};
}
export function getWeakSkills(state,grade){
  return Object.entries(state)
    .filter(([key,s])=>{const{topic}=parseSkillKey(key);return s.attempts>0&&s.p_know<0.55&&getTopicsForGrade(grade).includes(topic);})
    .sort((a,b)=>a[1].p_know-b[1].p_know).slice(0,3)
    .map(([key,s])=>{const{topic,difficulty}=parseSkillKey(key);return{topic,difficulty,mastery:s.p_know,attempts:s.attempts,...TOPICS[topic]};});
}
export function getTopicMastery(state,grade){
  const result={};
  for(const topic of getTopicsForGrade(grade)){
    // Include any skill with at least 1 attempt (consistent with backend threshold)
    const skills=Object.entries(state).filter(([k,s])=>{const{topic:t}=parseSkillKey(k);return t===topic&&s.attempts>0;}).map(([,s])=>s);
    result[topic]=skills.length>0?skills.reduce((sum,s)=>sum+s.p_know,0)/skills.length:null;
  }
  return result;
}
export function getSkillMatrix(state,grade){
  const matrix={};
  for(const topic of getTopicsForGrade(grade)){
    const maxDiff=getMaxDifficulty(topic,grade);matrix[topic]={};
    for(let d=1;d<=5;d++){const inCurr=d<=maxDiff;const skill=state[`${topic}_${d}`];
      matrix[topic][d]={inCurriculum:inCurr,unlocked:inCurr&&isDifficultyUnlocked(state,topic,d),attempted:(skill?.attempts||0)>0,mastery:(skill?.attempts||0)>=2?skill.p_know:null};
    }
  }
  return matrix;
}
// FIXED: Reliable misconception detection only (removed reversed_subtraction which was unreliable)
export function detectMisconception(question,studentAnswer){
  const correct=parseFloat(question.answer),student=parseFloat(studentAnswer);
  if(isNaN(correct)||isNaN(student))return null;
  const topic=question.topic;
  if(topic==='multiplication'){
    const m=question.text.match(/(\d+)\s*[×x]\s*(\d+)/);
    if(m){if(student===parseInt(m[1])+parseInt(m[2]))return 'addition_instead_of_multiplication';
          if(Math.abs(student-correct)===parseInt(m[1])||Math.abs(student-correct)===parseInt(m[2]))return 'off_by_one_factor';}
  }
  if(topic==='subtraction'){
    const m=question.text.match(/(\d+)\s*-\s*(\d+)/);
    if(m){const a=parseInt(m[1]),b=parseInt(m[2]);if(student===a+b)return 'addition_instead_of_subtraction';}
  }
  if(topic==='addition'){if(Math.abs(student-correct)===1)return 'counting_error';if(Math.abs(student-correct)===10)return 'place_value_error';}
  if(topic==='division'){const m=question.text.match(/(\d+)\s*[÷/]\s*(\d+)/);if(m&&student===parseInt(m[1])-parseInt(m[2]))return 'subtraction_instead_of_division';}
  return null;
}
export function initSkillState(){const s={};for(const topic of Object.keys(TOPICS))for(let d=1;d<=5;d++)s[`${topic}_${d}`]={p_know:0.1,attempts:0,correct:0,streak:0,last_seen:null};return s;}
const SK='mathquest_skill_state';
export const saveSkillState=s=>{try{localStorage.setItem(SK,JSON.stringify(s));}catch{}};
export const loadSkillState=()=>{try{const r=localStorage.getItem(SK);return r?JSON.parse(r):null;}catch{return null;}};
