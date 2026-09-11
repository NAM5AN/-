// Small integration fixes kept separate from the recovered studio flow.
$('#publish').onclick=async()=>{try{const data={...collect(),status:'published'};await save('게시 전 저장');await admin('publish',{data});current.revision+=1;current.data={...data,status:'published'};current.status='published';const i=drafts.findIndex(d=>d.id===current.id);if(i>=0)drafts[i]=current;$('#saveStatus').textContent='사이트에 게시됨';await ensureBackend();refreshSelect()}catch(e){$('#saveStatus').textContent=errText(e)}};
async function openTool(kind){try{await save(`${kind} 도구 열기`);const snapshot={...collect(),id:current.id,titles:current.data.titles||[]};sessionStorage.setItem('ssul_tool_draft',JSON.stringify(snapshot));location.href=`./${kind}.html?id=${encodeURIComponent(current.id)}`}catch(e){$('#saveStatus').textContent=errText(e)}}
$('#openInstagram').onclick=()=>openTool('instagram');
$('#openManuscript').onclick=()=>openTool('manuscript');
