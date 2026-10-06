const STORAGE_KEY = 'projectHQ.v1.projects';
const PREFS_KEY = 'projectHQ.v1.preferences';

const STAGES = ['Idea','Discovery','Planning','Setup','Build','Testing','Launch','Growth','Maintenance','Closed'];
const STATUSES = ['Ongoing','Ready','Waiting','Blocked','Paused','Attempted','Backlog','Completed','Cancelled','Archived'];
const PRIORITIES = ['Critical','High','Medium','Low','Someday'];
const HEALTH = ['On Track','At Risk','Blocked','Stale','Complete'];
const EFFORT = ['Tiny','Small','Medium','Large','Massive'];
const VALUE = ['Low','Medium','High','Very High'];

const COLUMNS = [
  { key:'id', label:'ID', sortable:true },
  { key:'name', label:'Project', sortable:true },
  { key:'area', label:'Brand / Area', sortable:true },
  { key:'type', label:'Type', sortable:true },
  { key:'stage', label:'Stage', sortable:true },
  { key:'status', label:'Status', sortable:true },
  { key:'priority', label:'Priority', sortable:true },
  { key:'health', label:'Health', sortable:true },
  { key:'progress', label:'Progress', sortable:true },
  { key:'startDate', label:'Started', sortable:true },
  { key:'targetDate', label:'Target', sortable:true },
  { key:'lastActivity', label:'Last Activity', sortable:true },
  { key:'nextAction', label:'Next Action', sortable:true },
  { key:'waitingOn', label:'Waiting On', sortable:true },
  { key:'blocker', label:'Blocker', sortable:true },
  { key:'effort', label:'Effort', sortable:true },
  { key:'value', label:'Value', sortable:true },
  { key:'revenueType', label:'Revenue', sortable:true },
  { key:'budget', label:'Budget', sortable:true },
  { key:'spent', label:'Spent', sortable:true },
  { key:'owner', label:'Owner', sortable:true },
  { key:'updatedAt', label:'Updated', sortable:true }
];

const DEFAULT_VISIBLE = ['id','name','area','stage','status','priority','health','progress','nextAction','updatedAt'];

const seedProjects = [
  project('PRJ-001','IZY Technologies Website','IZY Technologies','Website','Build','Ongoing','High','On Track',60,'Continue website development and maintenance.'),
  project('PRJ-002','IZY Technologies Company Profile','IZY Technologies','Brand / Document','Build','Ongoing','High','On Track',70,'Continue remaining company profile pages.'),
  project('PRJ-003','IZY Technologies Marketing Campaign','IZY Technologies','Marketing','Planning','Paused','Medium','At Risk',35,'Resume the Foundation Awareness campaign.'),
  project('PRJ-004','Velmora Banking Platform','Velmora','Web App','Build','Ongoing','High','At Risk',65,'Continue production fixes and backend work.'),
  project('PRJ-005','Android App Revenue Lab','Personal','App / Business','Discovery','Ongoing','High','On Track',20,'Develop and evaluate app ideas.'),
  project('PRJ-006','TK Pro Design Brand','TK Pro Design','Brand / Business','Growth','Ongoing','Medium','On Track',45,'Continue brand and business development.'),
  project('PRJ-007','Queensville Turnkey Projects Website','Queensville Turnkey Projects','Website','Maintenance','Ongoing','Medium','On Track',85,'Handle future website changes.'),
  project('PRJ-008','Save a Life Mission Website','Save a Life Mission','Website','Maintenance','Ongoing','Low','On Track',90,'Update when required.'),
  project('PRJ-009','Greater Glory Conference 2025','GGC','Conference / Website','Closed','Completed','Low','Complete',100,'Archive final project records.'),
  project('PRJ-010','Master Project Tracker','Personal','Operations','Build','Ongoing','High','On Track',10,'Set up and organize the live tracker.'),
];

function project(id,name,area,type,stage,status,priority,health,progress,nextAction){
  const now = new Date().toISOString();
  return {
    id,name,area,type,stage,status,priority,health,progress,
    startDate:'',targetDate:'',lastActivity:'',nextAction,waitingOn:'',blocker:'',effort:'',value:'',revenueType:'',budget:'',spent:'',owner:'TK',
    summary:'',objective:'',successCriteria:'',scope:'',outOfScope:'',deliverables:[],milestones:[],tasks:[],dependencies:[],risks:[],resources:[],links:[],
    activity:[{date: now, text:'Project added to Project HQ v1.'}], decisions:[], attempts:[], lessons:[], parkingLot:[], completionRecord:'', restartNotes:'',
    createdAt:now, updatedAt:now
  };
}

let projects = loadProjects();
let prefs = loadPrefs();
let currentView = 'all';
let sortState = { key:'updatedAt', dir:'desc' };
let selectedProjectId = null;
let activeTab = 'overview';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function loadProjects(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) && saved.length ? saved : structuredClone(seedProjects);
  } catch { return structuredClone(seedProjects); }
}
function saveProjects(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); }
function loadPrefs(){
  try { return {visible: DEFAULT_VISIBLE, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')}; }
  catch { return {visible: DEFAULT_VISIBLE}; }
}
function savePrefs(){ localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }
function esc(v=''){ return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function fmtDate(v){ if(!v) return '—'; const d=new Date(v); return isNaN(d)?v:d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); }
function fmtMoney(v){ if(v === '' || v == null) return '—'; const n=Number(v); if(Number.isNaN(n)) return esc(v); return new Intl.NumberFormat(undefined,{maximumFractionDigits:0}).format(n); }
function nextId(){
  const max = projects.reduce((m,p)=>Math.max(m, parseInt(String(p.id).replace(/\D/g,''))||0),0);
  return `PRJ-${String(max+1).padStart(3,'0')}`;
}

function statusClass(v){
  if(['Ongoing','Ready','Completed','On Track','Complete'].includes(v)) return 'good';
  if(['Waiting','Paused','At Risk'].includes(v)) return 'warn';
  if(['Blocked','Cancelled'].includes(v)) return 'bad';
  return 'info';
}

function init(){
  fillSelect($('#statusFilter'), STATUSES, 'All statuses');
  fillSelect($('#priorityFilter'), PRIORITIES, 'All priorities');
  fillSelect($('#stageFilter'), STAGES, 'All stages');
  fillSelect($('#stage'), STAGES);
  fillSelect($('#status'), STATUSES);
  fillSelect($('#priority'), PRIORITIES);
  fillSelect($('#health'), HEALTH);
  fillSelect($('#effort'), EFFORT, '—');
  fillSelect($('#value'), VALUE, '—');
  renderColumnsModal();
  bindEvents();
  renderAll();
}

function fillSelect(el, values, firstLabel){
  const first = firstLabel !== undefined ? `<option value="">${firstLabel}</option>` : '';
  el.innerHTML = first + values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
}

function bindEvents(){
  $('#searchInput').addEventListener('input', renderTable);
  $('#statusFilter').addEventListener('change', renderTable);
  $('#priorityFilter').addEventListener('change', renderTable);
  $('#stageFilter').addEventListener('change', renderTable);
  $('#addProjectBtn').addEventListener('click', ()=>openProjectModal());
  $('#closeModalBtn').addEventListener('click', ()=>$('#projectModal').close());
  $('#cancelProjectBtn').addEventListener('click', ()=>$('#projectModal').close());
  $('#projectForm').addEventListener('submit', saveProjectFromForm);
  $('#deleteProjectBtn').addEventListener('click', deleteCurrentProject);
  $('#columnsBtn').addEventListener('click', ()=>$('#columnsModal').showModal());
  $('#closeColumnsBtn').addEventListener('click', ()=>$('#columnsModal').close());
  $('#doneColumnsBtn').addEventListener('click', ()=>{$('#columnsModal').close(); renderTable();});
  $('#closeDrawerBtn').addEventListener('click', closeDrawer);
  $('#backdrop').addEventListener('click', closeDrawer);
  $('#editProjectBtn').addEventListener('click', ()=>{ const p=getSelected(); if(p) openProjectModal(p); });
  $('#menuBtn').addEventListener('click', ()=>$('#sidebar').classList.toggle('open'));
  $('#exportBtn').addEventListener('click', exportBackup);
  $('#importInput').addEventListener('change', importBackup);

  $$('.nav-item').forEach(btn=>btn.addEventListener('click', ()=>{
    currentView = btn.dataset.view;
    $$('.nav-item').forEach(x=>x.classList.toggle('active', x===btn));
    $('#sidebar').classList.remove('open');
    renderTable();
  }));
  $$('.tab').forEach(btn=>btn.addEventListener('click', ()=>{
    activeTab = btn.dataset.tab;
    $$('.tab').forEach(x=>x.classList.toggle('active', x===btn));
    renderDrawer();
  }));
}

function renderAll(){ renderStats(); renderCounts(); renderTable(); }

function renderStats(){
  const total=projects.filter(p=>p.status!=='Archived').length;
  const active=projects.filter(p=>['Ongoing','Ready'].includes(p.status)).length;
  const blocked=projects.filter(p=>p.status==='Blocked').length;
  const paused=projects.filter(p=>p.status==='Paused').length;
  const completed=projects.filter(p=>p.status==='Completed').length;
  $('#statsGrid').innerHTML = [
    ['Total Projects',total,'Across all non-archived work'],
    ['Active',active,'Ongoing + ready'],
    ['Blocked',blocked,'Needs intervention'],
    ['Paused',paused,'Intentionally stopped'],
    ['Completed',completed,'Successfully finished']
  ].map(([a,b,c])=>`<article class="stat-card"><div class="stat-label">${a}</div><div class="stat-value">${b}</div><div class="stat-foot">${c}</div></article>`).join('');
}

function renderCounts(){
  const map = {
    all: projects.length,
    active: projects.filter(p=>['Ongoing','Ready'].includes(p.status)).length,
    ideas: projects.filter(p=>p.stage==='Idea').length,
    ready: projects.filter(p=>p.status==='Ready').length,
    blocked: projects.filter(p=>p.status==='Blocked').length,
    waiting: projects.filter(p=>p.status==='Waiting').length,
    paused: projects.filter(p=>p.status==='Paused').length,
    attempted: projects.filter(p=>p.status==='Attempted').length,
    completed: projects.filter(p=>p.status==='Completed').length,
    archived: projects.filter(p=>p.status==='Archived').length,
  };
  Object.entries(map).forEach(([k,v])=>{ const el=$(`#count-${k}`); if(el) el.textContent=v; });
}

function filteredProjects(){
  const q=$('#searchInput').value.trim().toLowerCase();
  const sf=$('#statusFilter').value, pf=$('#priorityFilter').value, stf=$('#stageFilter').value;
  let out = projects.filter(p=>{
    if(currentView==='active' && !['Ongoing','Ready'].includes(p.status)) return false;
    if(currentView==='ideas' && p.stage!=='Idea') return false;
    if(['ready','blocked','waiting','paused','attempted','completed','archived'].includes(currentView) && p.status.toLowerCase()!==currentView) return false;
    if(sf && p.status!==sf) return false;
    if(pf && p.priority!==pf) return false;
    if(stf && p.stage!==stf) return false;
    if(q){
      const blob = [p.id,p.name,p.area,p.type,p.stage,p.status,p.priority,p.health,p.nextAction,p.waitingOn,p.blocker,p.summary,p.objective].join(' ').toLowerCase();
      if(!blob.includes(q)) return false;
    }
    return true;
  });
  out.sort((a,b)=>{
    let av=a[sortState.key] ?? '', bv=b[sortState.key] ?? '';
    if(sortState.key==='progress' || sortState.key==='budget' || sortState.key==='spent'){ av=Number(av)||0; bv=Number(bv)||0; }
    else { av=String(av).toLowerCase(); bv=String(bv).toLowerCase(); }
    if(av < bv) return sortState.dir==='asc'?-1:1;
    if(av > bv) return sortState.dir==='asc'?1:-1;
    return 0;
  });
  return out;
}

function renderTable(){
  const visible = COLUMNS.filter(c=>prefs.visible.includes(c.key));
  $('#tableHead').innerHTML = visible.map(c=>`<th class="${c.sortable?'sortable':''}" data-key="${c.key}">${c.label}${sortState.key===c.key?(sortState.dir==='asc'?' ↑':' ↓'):''}</th>`).join('');
  $$('#tableHead th.sortable').forEach(th=>th.addEventListener('click', ()=>{
    const key=th.dataset.key;
    sortState = sortState.key===key ? {key,dir:sortState.dir==='asc'?'desc':'asc'} : {key,dir:'asc'};
    renderTable();
  }));

  const rows=filteredProjects();
  $('#resultCount').textContent=`${rows.length} project${rows.length===1?'':'s'}`;
  const viewBtn=$(`.nav-item[data-view="${currentView}"]`);
  $('#viewTitle').textContent=viewBtn?viewBtn.querySelector('span').textContent:'All Projects';
  $('#emptyState').hidden = rows.length>0;
  $('#projectsTable').style.display = rows.length ? 'table' : 'none';

  $('#tableBody').innerHTML = rows.map(p=>`<tr data-id="${p.id}">${visible.map(c=>`<td>${cell(p,c.key)}</td>`).join('')}</tr>`).join('');
  $$('#tableBody tr').forEach(tr=>tr.addEventListener('click', ()=>openDrawer(tr.dataset.id)));
}

function cell(p,key){
  const v=p[key];
  if(key==='name') return `<div class="project-cell"><strong>${esc(v)}</strong><small>${esc(p.type||'Unclassified')}</small></div>`;
  if(['stage','status','priority','health'].includes(key)) return v?`<span class="chip ${statusClass(v)}">${esc(v)}</span>`:'—';
  if(key==='progress') return `<div class="progress-cell"><div class="progress-row"><div class="progress-track"><div class="progress-fill" style="width:${Math.max(0,Math.min(100,Number(v)||0))}%"></div></div><span>${Number(v)||0}%</span></div></div>`;
  if(['startDate','targetDate','lastActivity','updatedAt'].includes(key)) return `<span class="muted">${fmtDate(v)}</span>`;
  if(['budget','spent'].includes(key)) return fmtMoney(v);
  return v?esc(v):'<span class="muted">—</span>';
}

function renderColumnsModal(){
  $('#columnsList').innerHTML = COLUMNS.map(c=>`<label class="column-toggle"><input type="checkbox" data-col="${c.key}" ${prefs.visible.includes(c.key)?'checked':''}><span>${c.label}</span></label>`).join('');
  $$('#columnsList input').forEach(cb=>cb.addEventListener('change', ()=>{
    if(cb.checked){ if(!prefs.visible.includes(cb.dataset.col)) prefs.visible.push(cb.dataset.col); }
    else { prefs.visible=prefs.visible.filter(x=>x!==cb.dataset.col); }
    savePrefs();
  }));
}

function openDrawer(id){
  selectedProjectId=id; activeTab='overview';
  $$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab==='overview'));
  renderDrawer();
  $('#backdrop').hidden=false;
  $('#projectDrawer').classList.add('open');
  $('#projectDrawer').setAttribute('aria-hidden','false');
}
function closeDrawer(){ $('#projectDrawer').classList.remove('open'); $('#projectDrawer').setAttribute('aria-hidden','true'); $('#backdrop').hidden=true; }
function getSelected(){ return projects.find(p=>p.id===selectedProjectId); }

function renderDrawer(){
  const p=getSelected(); if(!p) return;
  $('#drawerId').textContent=p.id;
  $('#drawerTitle').textContent=p.name;
  $('#drawerMeta').innerHTML=[p.stage,p.status,p.priority,p.health,`${p.progress||0}%`].filter(Boolean).map(v=>`<span class="chip ${statusClass(v)}">${esc(v)}</span>`).join('');
  const body=$('#drawerBody');
  if(activeTab==='overview') body.innerHTML = overviewHtml(p);
  if(activeTab==='tasks') body.innerHTML = listTabHtml('Current tasks',p.tasks,'No tasks recorded yet.') + listTabHtml('Milestones',p.milestones,'No milestones recorded yet.');
  if(activeTab==='activity') body.innerHTML = timelineHtml(p.activity,'No activity recorded yet.');
  if(activeTab==='decisions') body.innerHTML = timelineHtml(p.decisions,'No decisions recorded yet.') + listTabHtml('Attempts & lessons',p.attempts,'No attempts recorded yet.');
  if(activeTab==='finance') body.innerHTML = financeHtml(p);
}

function overviewHtml(p){
  return `<div class="detail-grid">
    ${detail('Summary',p.summary||'No summary added yet.',true)}
    ${detail('Objective',p.objective||'No objective added yet.')}
    ${detail('Next action',p.nextAction||'No next action set.')}
    ${detail('Waiting on',p.waitingOn||'Nothing recorded.')}
    ${detail('Blocker',p.blocker||'No blocker recorded.')}
    ${detail('Success criteria',p.successCriteria||'Not defined yet.',true)}
    ${detail('Scope',p.scope||'Not defined yet.',true)}
    ${detail('Restart notes',p.restartNotes||'No restart notes.',true)}
  </div>`;
}
function detail(title,text,wide=false){ return `<section class="detail-card ${wide?'wide':''}"><h3>${esc(title)}</h3><p>${esc(text)}</p></section>`; }
function listTabHtml(title,items,empty){
  const arr=Array.isArray(items)?items:[];
  return `<section class="detail-card wide"><h3>${esc(title)}</h3><div class="detail-list">${arr.length?arr.map(x=>`<div class="detail-item"><strong>${esc(typeof x==='string'?x:(x.title||x.text||'Item'))}</strong>${typeof x==='object'&&x.note?`<small>${esc(x.note)}</small>`:''}</div>`).join(''):`<p>${esc(empty)}</p>`}</div></section>`;
}
function timelineHtml(items,empty){
  const arr=Array.isArray(items)?items:[];
  return `<section class="detail-card wide"><h3>History</h3><div class="detail-list">${arr.length?arr.slice().reverse().map(x=>`<div class="detail-item"><strong>${esc(x.text||x.title||'Update')}</strong><small>${fmtDate(x.date)}</small></div>`).join(''):`<p>${esc(empty)}</p>`}</div></section>`;
}
function financeHtml(p){
  return `<div class="detail-grid">
    ${detail('Revenue type',p.revenueType||'Not set')}
    ${detail('Budget',fmtMoney(p.budget))}
    ${detail('Spent',fmtMoney(p.spent))}
    ${detail('Remaining',p.budget!==''?fmtMoney((Number(p.budget)||0)-(Number(p.spent)||0)):'—')}
  </div>`;
}

function openProjectModal(p=null){
  $('#projectForm').reset();
  $('#projectId').value=p?.id||'';
  $('#modalEyebrow').textContent=p?'Edit project':'New project';
  $('#modalTitle').textContent=p?p.name:'Create project';
  $('#deleteProjectBtn').hidden=!p;
  const values={
    name:p?.name||'', area:p?.area||'', type:p?.type||'', stage:p?.stage||'Idea', status:p?.status||'Backlog', priority:p?.priority||'Medium', health:p?.health||'On Track', progress:p?.progress??0,
    effort:p?.effort||'', value:p?.value||'', startDate:p?.startDate||'', targetDate:p?.targetDate||'', summary:p?.summary||'', objective:p?.objective||'', nextAction:p?.nextAction||'', waitingOn:p?.waitingOn||'', blocker:p?.blocker||'', revenueType:p?.revenueType||'', owner:p?.owner||'TK', budget:p?.budget||'', spent:p?.spent||''
  };
  Object.entries(values).forEach(([k,v])=>{ const el=$(`#${k}`); if(el) el.value=v; });
  $('#projectModal').showModal();
}

function saveProjectFromForm(e){
  e.preventDefault();
  const id=$('#projectId').value;
  const now=new Date().toISOString();
  const payload={};
  ['name','area','type','stage','status','priority','health','progress','effort','value','startDate','targetDate','summary','objective','nextAction','waitingOn','blocker','revenueType','owner','budget','spent'].forEach(k=>payload[k]=$(`#${k}`).value);
  payload.progress=Math.max(0,Math.min(100,Number(payload.progress)||0));

  if(id){
    const i=projects.findIndex(p=>p.id===id);
    if(i<0) return;
    const before=projects[i];
    const changed=[];
    ['stage','status','priority','health','progress','nextAction','blocker'].forEach(k=>{ if(String(before[k]??'')!==String(payload[k]??'')) changed.push(`${k}: ${before[k]||'—'} → ${payload[k]||'—'}`); });
    projects[i]={...before,...payload,updatedAt:now,lastActivity:now,activity:[...(before.activity||[]),...(changed.length?[{date:now,text:`Updated ${changed.join('; ')}`}]:[{date:now,text:'Project details updated.'}])]};
    selectedProjectId=id;
  } else {
    const idNew=nextId();
    const p=project(idNew,payload.name,payload.area,payload.type,payload.stage,payload.status,payload.priority,payload.health,payload.progress,payload.nextAction);
    projects.unshift({...p,...payload,id:idNew,createdAt:now,updatedAt:now,lastActivity:now});
    selectedProjectId=idNew;
  }
  saveProjects(); $('#projectModal').close(); renderAll();
  if(selectedProjectId){ openDrawer(selectedProjectId); }
}

function deleteCurrentProject(){
  const id=$('#projectId').value; if(!id) return;
  if(!confirm('Delete this project permanently?')) return;
  projects=projects.filter(p=>p.id!==id); saveProjects(); $('#projectModal').close(); closeDrawer(); renderAll();
}

function exportBackup(){
  const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),projects},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`project-hq-v1-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
}
function importBackup(e){
  const file=e.target.files?.[0]; if(!file) return;
  const r=new FileReader();
  r.onload=()=>{
    try {
      const data=JSON.parse(r.result); const incoming=Array.isArray(data)?data:data.projects;
      if(!Array.isArray(incoming)) throw new Error();
      if(confirm(`Replace current tracker with ${incoming.length} imported projects?`)){ projects=incoming; saveProjects(); renderAll(); }
    } catch { alert('That file is not a valid Project HQ backup.'); }
    e.target.value='';
  };
  r.readAsText(file);
}

document.addEventListener('DOMContentLoaded', init);
