import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SSUL_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SSUL_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const SEEDS = [
  {id:'1',category:'직장생활',title:'퇴사도 안 했는데, 내 후임이 출근했다',titles:['퇴사도 안 했는데, 내 후임이 출근했다','내 자리에 후임이 먼저 왔다','인수인계 받으러 왔다는 낯선 사람'],teaser:'월요일 아침, 처음 보는 사람이 내 옆에 앉았다. 그러더니 웃으면서 말했다. “인수인계 받으러 왔습니다.”',before_content:'월요일 아침에 출근했는데, 내 자리 옆에 처음 보는 사람이 앉아 있었음. 노트북도 새것이고 사원증도 있어서 당연히 다른 팀 신입인 줄 알았다.\n\n그런데 나를 보더니 벌떡 일어나는 거야. “안녕하세요. 오늘부터 인수인계 받기로 한 사람입니다.”\n\n인수인계? 내가 “누구 업무요?”라고 물었더니, 내 이름을 정확하게 말했다. 순간 커피 뚜껑만 만지작거렸다. 나는 사직서를 낸 적이 없었거든.',after_content:'딱 한 번, 한 달 전에 팀장한테 개인적으로 말한 적은 있었음. 요즘 일이 너무 몰려서 계속 다니는 게 맞는지 모르겠다고. 팀장은 사람 더 뽑을 테니까 조금만 기다려 달랬고.\n\n그래서 좋은 쪽으로 생각하려고 했다. 아, 내 일을 같이 해줄 사람이구나. 그런데 신입이 다음 말을 하더라. “전임자분은 이번 주까지만 나오신다고 들었습니다.”\n\n신입이 휴대폰을 꺼내 메일 화면을 보여줬다. 나는 내용보다 발송 날짜부터 두 번 읽었다. 내가 팀장한테 고민을 털어놓기 전 날짜였다.\n\n그제야 이 사람이 실수로 온 게 아니라는 걸 알았다. 팀장이 내 퇴사를 나보다 먼저 결정해 두고, 인수인계 일정까지 잡아 둔 거였다.',story_bible:'화자: 기존 담당 직원. 신입: 화자의 후임으로 채용된 사람. 팀장: 화자가 퇴사를 고민한다고 말하기 전부터 후임 채용을 진행한 인물. 시간순서와 메일 발송 날짜가 핵심.',gate_line:'신입이 화면을 돌린 이유.',hook:'퇴사도 안 했는데\n내 후임이\n출근했다',cover_detail:'“인수인계 받으러 왔습니다.”',caption:'출근했더니 처음 보는 사람이 내 업무를 인수인계 받으러 왔다고 했다. 나는 사직서를 낸 적이 없었는데. 이런 상황이면 바로 팀장한테 물어볼 것 같아? 전체 글은 프로필 링크.',hashtags:['#썰판','#썰','#직장생활','#회사썰','#인수인계'],tags:['회사썰','직장생활','인수인계'],published_at:'2026-09-10T00:00:00+09:00'},
  {id:'2',category:'인간관계',title:'내 결혼식 못 온다던 친구가, 다른 식장 사진에 찍혔다',titles:['내 결혼식 못 온다던 친구가, 다른 식장 사진에 찍혔다','가족 일 있다던 친구의 사진','12년 친구가 숨긴 결혼식'],teaser:'가족 일 때문에 못 온다던 12년 친구. 그런데 내 결혼식 다음 날, 다른 신부 옆에서 웃고 있는 사진을 봤다.',before_content:'12년을 친구로 지낸 사람이었다. 내 결혼식에는 가족 일이 생겨 정말 미안하다며 오지 못한다고 했다.\n\n서운했지만 이해하려 했다. 그런데 우연히 본 사진 한 장에서 그 친구가 다른 결혼식장에 있었다.',after_content:'처음에는 날짜를 잘못 본 줄 알았다. 사진을 확대해 보고, 올라온 시간을 다시 확인했다.\n\n내 결혼식이 끝난 다음 날도 아니었다. 같은 날, 다른 시간대 식장이었다.\n\n사진 속 표정이 너무 밝아서 오히려 무슨 말을 해야 할지 모르겠더라.',story_bible:'화자와 친구는 12년 지기. 친구는 가족 일을 이유로 화자 결혼식에 불참했지만 같은 날 다른 결혼식에는 참석했다.',gate_line:'사진을 확대하자 날짜가 먼저 보였다.',hook:'내 결혼식은 못 온다던\n12년 친구가\n다른 식장에 있었다',cover_detail:'“가족 일이 생겨서 정말 미안해.”',caption:'가족 일 때문에 못 온다던 친구가 같은 날 다른 결혼식 사진에 찍혔다. 너라면 바로 물어볼 것 같아? 전체 글은 프로필 링크.',hashtags:['#썰판','#썰','#친구썰','#결혼식','#인간관계'],tags:['친구썰','결혼식','인간관계'],published_at:'2026-09-09T00:00:00+09:00'},
  {id:'3',category:'일상',title:'중고거래하러 갔더니 판매자가 엄마였다',titles:['중고거래하러 갔더니 판매자가 엄마였다','중고거래 약속 장소에 엄마가 나왔다','익숙했던 중고거래 사진의 정체'],teaser:'사진 속 스탠드가 익숙했다. 설마 했는데, 약속 장소에 익숙한 사람이 서 있었다.',before_content:'중고거래 앱에서 마음에 드는 스탠드를 발견했다. 사진을 보는데 어딘가 너무 익숙했다.\n\n가격이 괜찮아서 약속을 잡고 나갔는데, 멀리서부터 익숙한 사람이 보였다.',after_content:'판매자가 우리 엄마였다. 서로 한동안 말없이 쳐다봤다.\n\n엄마는 결국 그냥 가져가라고 했고, 나는 왜 집에 있던 걸 돈 주고 사려고 했는지 설명해야 했다.',story_bible:'화자와 판매자는 모녀 관계. 서로의 중고거래 계정을 몰랐다.',gate_line:'약속 장소에 나온 사람을 보고 멈췄다.',hook:'중고거래하러 갔더니\n판매자가\n엄마였다',cover_detail:'사진 속 스탠드가 너무 익숙했다.',caption:'마음에 든 중고 스탠드를 사러 갔는데 판매자가 엄마였다. 가족이랑 중고거래 앱 계정 공유해? 전체 글은 프로필 링크.',hashtags:['#썰판','#썰','#일상썰','#중고거래','#가족썰'],tags:['일상썰','중고거래','가족썰'],published_at:'2026-09-08T00:00:00+09:00'},
  {id:'4',category:'직장생활',title:'신입이 회의록 한 줄을 읽자, 팀장 얼굴이 굳었다',titles:['신입이 회의록 한 줄을 읽자, 팀장 얼굴이 굳었다','내 실수라던 팀장 앞에서 신입이 노트북을 돌렸다','회의록 한 줄이 바꾼 회의'],teaser:'팀장이 사람들 앞에서 내 실수라고 했다. 그때 입사한 지 한 달 된 신입이 노트북을 돌렸다.',before_content:'회의가 시작되자 팀장은 일정이 밀린 이유가 내 실수 때문이라고 말했다.\n\n나는 반박할 타이밍을 놓쳤다. 그때 입사한 지 한 달 된 신입이 조용히 노트북을 돌렸다.',after_content:'회의록에는 팀장이 직접 일정 변경을 지시한 날짜와 내용이 그대로 남아 있었다.\n\n신입이 그 한 줄을 읽자 회의실이 조용해졌다. 팀장은 화면을 한 번 보고 더 이상 내 이름을 말하지 않았다.',story_bible:'화자, 팀장, 입사 한 달 신입. 회의록이 사실관계를 증명한다.',gate_line:'신입이 화면을 돌린 이유.',hook:'신입이 회의록을 읽자\n팀장 얼굴이\n굳었다',cover_detail:'“여기 지난 회의 내용이 남아 있는데요.”',caption:'내 실수라고 몰아가던 회의에서 신입이 지난 회의록을 열었다. 너라면 신입처럼 바로 말할 수 있을 것 같아? 전체 글은 프로필 링크.',hashtags:['#썰판','#썰','#직장생활','#회사썰','#신입'],tags:['신입','직장인공감','회사썰'],published_at:'2026-09-07T00:00:00+09:00'},
  {id:'5',category:'인간관계',title:'생일 선물 대신, 친구가 반나절을 비워줬다',titles:['생일 선물 대신, 친구가 반나절을 비워줬다','아무것도 필요 없다 했더니 친구가 시간을 줬다','토요일 오전을 비워 두라는 생일 선물'],teaser:'필요한 거 있냐는 말에 아무것도 없다고 했다. 친구는 토요일 오전을 비워 두라고 했다.',before_content:'생일이 다가오자 친구가 필요한 게 있냐고 물었다. 정말 갖고 싶은 게 없어서 아무것도 없다고 했다.\n\n친구는 선물 대신 토요일 오전을 비워 두라고 했다.',after_content:'그날 우리는 미뤄 둔 병원 예약도 가고, 머리도 자르고, 점심도 먹었다.\n\n물건은 하나도 받지 않았는데 생각보다 오래 기억에 남는 선물이었다.',story_bible:'화자와 가까운 친구. 친구는 물건 대신 시간을 선물한다.',gate_line:'친구가 토요일 오전을 비워 두라고 했다.',hook:'생일 선물 대신\n친구가 반나절을\n비워줬다',cover_detail:'“토요일 오전은 그냥 비워 둬.”',caption:'갖고 싶은 게 없다고 했더니 친구가 자기 반나절을 비워 줬다. 물건보다 시간 선물이 더 좋았던 적 있어? 전체 글은 프로필 링크.',hashtags:['#썰판','#썰','#친구썰','#생일선물','#인간관계'],tags:['친구썰','생일선물','인간관계'],published_at:'2026-09-06T00:00:00+09:00'},
  {id:'6',category:'일상',title:'매일 엘리베이터를 잡아주던 사람이 안 보였다',titles:['매일 엘리베이터를 잡아주던 사람이 안 보였다','인사만 하던 이웃이 며칠째 보이지 않았다','매일 같은 시간에 만나던 이웃'],teaser:'같은 시간에 출근하던 이웃. 인사밖에 해본 적 없는데, 며칠째 안 보이니 신경이 쓰였다.',before_content:'매일 아침 같은 시간에 엘리베이터를 타는 이웃이 있었다. 먼저 도착하면 늘 문을 잡아줬다.\n\n그런데 어느 날부터 보이지 않았다. 인사밖에 해본 적 없는데 이상하게 계속 신경이 쓰였다.',after_content:'며칠 뒤 다시 마주쳤을 때 괜히 반가워서 평소보다 먼저 인사를 건넸다.\n\n그 사람도 웃으면서 오랜만이라고 했다. 매일 반복되던 짧은 인사가 생각보다 큰 일상이었나 보다.',story_bible:'같은 건물 이웃 두 사람. 매일 출근 시간에 엘리베이터에서 짧게 인사하는 사이.',gate_line:'며칠째 같은 시간에 문이 닫혔다.',hook:'매일 엘리베이터를\n잡아주던 사람이\n안 보였다',cover_detail:'인사밖에 안 했는데 계속 신경이 쓰였다.',caption:'매일 출근길에 인사만 하던 이웃이 며칠 보이지 않았다. 별말 안 해도 익숙해진 사람이 있어? 전체 글은 프로필 링크.',hashtags:['#썰판','#썰','#일상썰','#이웃','#출근'],tags:['일상썰','이웃','출근'],published_at:'2026-09-05T00:00:00+09:00'}
].map(x=>({...x,status:'published',view_count:0,source_image_paths:[]}));

function client(){
  if(!SUPABASE_URL||!SERVICE_ROLE) throw new Error('SUPABASE_CONFIG_MISSING');
  return createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false,autoRefreshToken:false}});
}
function missingTable(error){return ['42P01','PGRST205','PGRST204'].includes(error?.code)||/ssul_posts|schema cache|does not exist|Could not find the table/i.test(error?.message||'')}
async function bootstrap(){
  const r=await fetch(`${SUPABASE_URL}/functions/v1/ssul_bootstrap`,{method:'POST',headers:{authorization:`Bearer ${SERVICE_ROLE}`,apikey:SERVICE_ROLE,'content-type':'application/json'},body:'{}'});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!data.ok) throw new Error(data.error||`SSUL_BOOTSTRAP_${r.status}`);
  await new Promise(r=>setTimeout(r,350));
}
async function ensureSeed(sb){
  const {data:flag,error:flagErr}=await sb.from('ssul_settings').select('key').eq('key','seed_v21_done').maybeSingle();
  if(flagErr) throw flagErr;
  if(flag) return;
  const {error}=await sb.from('ssul_posts').upsert(SEEDS,{onConflict:'id'}); if(error) throw error;
  const {error:setErr}=await sb.from('ssul_settings').upsert({key:'seed_v21_done',value:{source:'sseolzip-v21',count:SEEDS.length,seeded_at:new Date().toISOString()}},{onConflict:'key'}); if(setErr) throw setErr;
}
async function ready(){
  const sb=client();
  let probe=await sb.from('ssul_posts').select('id',{head:true,count:'exact'});
  if(probe.error&&missingTable(probe.error)){await bootstrap();probe=await sb.from('ssul_posts').select('id',{head:true,count:'exact'});}
  if(probe.error) throw probe.error;
  await ensureSeed(sb);
  return sb;
}
function publicPost(row){return {id:String(row.id),status:row.status,category:row.category,title:row.title,titles:row.titles||[],teaser:row.teaser||'',beforeContent:row.before_content||'',afterContent:row.after_content||'',storyBible:row.story_bible||'',gateLine:row.gate_line||'',hook:row.hook||'',coverDetail:row.cover_detail||'',caption:row.caption||'',hashtags:row.hashtags||[],tags:row.tags||[],thumbnailPath:row.thumbnail_path||null,coverPath:row.cover_path||null,imageIds:row.source_image_paths||[],views:Number(row.view_count||0),date:(row.published_at||row.created_at||'').slice(0,10),publishedAt:row.published_at||null};}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    const sb=await ready();
    if(req.method==='GET'){
      const id=String(req.query?.id||'');
      if(id){const {data,error}=await sb.from('ssul_posts').select('*').eq('id',id).eq('status','published').maybeSingle();if(error)throw error;if(!data)return res.status(404).json({ok:false,error:'NOT_FOUND'});return res.status(200).json({ok:true,post:publicPost(data)});}
      const {data,error}=await sb.from('ssul_posts').select('*').eq('status','published').order('published_at',{ascending:false});if(error)throw error;
      return res.status(200).json({ok:true,posts:(data||[]).map(publicPost)});
    }
    if(req.method==='POST'){
      const action=String(req.body?.action||'');
      if(action==='view'){
        const id=String(req.body?.id||''); if(!id)return res.status(400).json({ok:false,error:'ID_REQUIRED'});
        const {data,error}=await sb.rpc('ssul_increment_view',{p_id:id});if(error)throw error;
        return res.status(200).json({ok:true,views:Number(data||0)});
      }
      if(action==='health') return res.status(200).json({ok:true,schemaReady:true});
      return res.status(400).json({ok:false,error:'UNKNOWN_ACTION'});
    }
    res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  }catch(e){
    console.error('ssul_posts',e);
    return res.status(503).json({ok:false,error:e?.message||String(e),fallback:true});
  }
}
